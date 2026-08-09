import { ContractFactory, Wallet } from 'ethers';
import { getProvider } from '../lib/rpc.js';
import { validateOrigin } from '../lib/origin.js';
import { requireSession } from '../lib/auth.js';
import { checkRateLimit } from '../lib/ratelimit.js';
import { reserveOperationId, updateOperationState, OpState, isValidUuidV4 } from '../lib/replay.js';
import { CHAIN_ID, TOKEN_ADDRESS, POLICY_ADDRESS, VAULT_ADDRESS } from '../lib/constants.js';
import { SUSPENSE_VAULT_ARTIFACT } from '../lib/suspense-vault-artifact.js';

export const EXPECTED_DEPLOY_SIGNER = '0xE60435c0FBe928f3F8ed367Eafb65D955FCF5c06';
export const DEPLOY_ARM_KEY = 'SUSPENSE_VAULT_DEPLOYMENT_ARMED';
export const DEPLOY_REPLAY_SCOPE = 'deploy-runtime-vault';

function normalizedError(res, status, error, detail) {
  return res.status(status).json(detail ? { error, detail } : { error });
}

export function createDeployRuntimeVaultHandler(deps = {}) {
  const {
    validateOriginFn = validateOrigin,
    requireSessionFn = requireSession,
    checkRateLimitFn = checkRateLimit,
    reserveOperationIdFn = reserveOperationId,
    updateOperationStateFn = updateOperationState,
    getProviderFn = getProvider,
    WalletCtor = Wallet,
    ContractFactoryCtor = ContractFactory,
    artifact = SUSPENSE_VAULT_ARTIFACT,
  } = deps;

  return async function handler(req, res) {
  if (req.method !== 'POST') {
    return normalizedError(res, 405, 'Method Not Allowed');
  }

  const origin = validateOriginFn(req);
  if (!origin.valid) {
    return normalizedError(res, 403, 'ORIGIN_REJECTED');
  }

  const session = requireSessionFn(req, res);
  if (!session.proceed) {
    return;
  }

  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const rate = await checkRateLimitFn(ip, 'distribute');
  if (!rate.allowed) {
    return normalizedError(res, rate.status === 503 ? 503 : 429, rate.status === 503 ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED');
  }

  if (process.env[DEPLOY_ARM_KEY] !== 'OPEN') {
    return normalizedError(res, 409, 'DEPLOYMENT_NOT_ARMED');
  }

  const signerSecret = process.env.SUSPENSE_DEMO_SIGNER_PRIVATE_KEY;
  if (!signerSecret) {
    return normalizedError(res, 503, 'SIGNER_NOT_CONFIGURED');
  }

  const operationId = req.body?.operationId;
  if (!isValidUuidV4(operationId)) {
    return normalizedError(res, 400, 'INVALID_REQUEST', 'operationId must be UUID v4');
  }

  const reserved = await reserveOperationIdFn(DEPLOY_REPLAY_SCOPE, operationId);
  if (!reserved.reserved) {
    return normalizedError(res, reserved.status ?? 503, reserved.status === 409 ? 'DUPLICATE_OPERATION_ID' : 'REPLAY_UNAVAILABLE');
  }

  try {
    const provider = await getProviderFn();
    const wallet = new WalletCtor(signerSecret, provider);
    const signerAddress = await wallet.getAddress();
    if (signerAddress.toLowerCase() !== EXPECTED_DEPLOY_SIGNER.toLowerCase()) {
      throw new Error('SIGNER_MISMATCH');
    }

    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      throw new Error(`CHAIN_MISMATCH:${network.chainId}`);
    }

    const nonce = await provider.getTransactionCount(signerAddress, 'pending');
    if (nonce !== 0) {
      throw new Error('NONCE_NOT_ZERO');
    }

    const balance = await provider.getBalance(signerAddress);
    if (balance <= 0n) {
      throw new Error('SIGNER_EMPTY');
    }

    const factory = new ContractFactoryCtor(
      artifact.abi,
      artifact.bytecode,
      wallet
    );

    await factory.getDeployTransaction(TOKEN_ADDRESS, POLICY_ADDRESS, EXPECTED_DEPLOY_SIGNER);
    const expected = {
      token: TOKEN_ADDRESS,
      policy: POLICY_ADDRESS,
      owner: EXPECTED_DEPLOY_SIGNER,
      historicalVault: VAULT_ADDRESS,
    };

    const contract = await factory.deploy(TOKEN_ADDRESS, POLICY_ADDRESS, EXPECTED_DEPLOY_SIGNER);
    await updateOperationStateFn(DEPLOY_REPLAY_SCOPE, operationId, OpState.SUBMITTED);
    const receipt = await contract.deploymentTransaction().wait();
    await updateOperationStateFn(DEPLOY_REPLAY_SCOPE, operationId, OpState.CONFIRMED);

    const owner = await contract.owner();
    const token = await contract.token();
    const policy = await contract.policy();
    const code = await provider.getCode(contract.target);
    if (!code || code === '0x') {
      throw new Error('BYTECODE_NOT_PRESENT');
    }

    return res.status(200).json({
      ok: true,
      chainId: Number(network.chainId),
      signer: signerAddress,
      nonceBefore: nonce,
      nonceAfter: nonce + 1,
      vaultAddress: contract.target,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString?.() ?? null,
      owner,
      token,
      policy,
      bytecodePresent: true,
      artifactFingerprint: artifact.bytecodeFingerprint,
      fixedConstructor: expected,
    });
  } catch (err) {
    await updateOperationStateFn(DEPLOY_REPLAY_SCOPE, operationId, OpState.FAILED);
    return normalizedError(res, 503, 'DEPLOYMENT_FAILED');
  }
  };
}

export default createDeployRuntimeVaultHandler();
