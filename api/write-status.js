import { Wallet, formatUnits } from 'ethers';
import { requireSession } from '../lib/auth.js';
import {
  EXPECTED_DISTRIBUTE_SIGNER,
  evaluateWriteArm,
  getRuntimeVaultAddress,
  getWriteGateState,
} from '../lib/write-context.js';
import { getContracts } from '../lib/rpc.js';
import { CHAIN_ID, DEMO_COHORT, oneToken } from '../lib/constants.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const session = requireSession(req, res);
  if (!session.proceed) return;

  try {
    const runtimeVault = getRuntimeVaultAddress();
    if (!runtimeVault) return res.status(503).json({ error: 'RUNTIME_VAULT_NOT_CONFIGURED' });

    const { provider, token } = await getContracts();
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      return res.status(503).json({ error: 'CHAIN_MISMATCH' });
    }

    const decimals = Number(await token.decimals());
    const symbol = await token.symbol();
    const vaultBalanceRaw = await token.balanceOf(runtimeVault);
    const requiredBalanceRaw = BigInt(DEMO_COHORT.length) * oneToken(decimals);

    const signerSecret = process.env.SUSPENSE_DEMO_SIGNER_PRIVATE_KEY;
    let signerState = 'NOT_CONFIGURED';
    let gasReady = false;

    if (signerSecret) {
      try {
        const wallet = new Wallet(signerSecret, provider);
        const signer = await wallet.getAddress();
        signerState = signer.toLowerCase() === EXPECTED_DISTRIBUTE_SIGNER.toLowerCase() ? 'MATCH' : 'MISMATCH';
        if (signerState === 'MATCH') {
          gasReady = (await provider.getBalance(signer)) > 0n;
        }
      } catch {
        signerState = 'INVALID';
      }
    }

    const arm = evaluateWriteArm(req);
    const gate = getWriteGateState();
    const commonReady = arm.allowed && signerState === 'MATCH' && gasReady;
    const vaultFunded = vaultBalanceRaw >= requiredBalanceRaw;

    const blockers = [];
    if (!arm.allowed) blockers.push(arm.reason || 'WRITE_ARM_REQUIRED');
    if (signerState !== 'MATCH') blockers.push(`SIGNER_${signerState}`);
    if (!gasReady) blockers.push('SIGNER_GAS_REQUIRED');
    if (!vaultFunded) blockers.push('VAULT_FUNDING_REQUIRED');

    return res.status(200).json({
      ok: true,
      chainId: CHAIN_ID,
      symbol,
      runtimeVault,
      gatePolicy: gate,
      writeArm: arm.allowed ? 'ACTIVE' : 'INACTIVE',
      writeArmMode: arm.mode,
      writeArmExpiresAt: arm.exp ?? null,
      signerState,
      gasReady,
      vaultBalanceRaw: vaultBalanceRaw.toString(),
      vaultBalance: formatUnits(vaultBalanceRaw, decimals),
      requiredBalanceRaw: requiredBalanceRaw.toString(),
      requiredBalance: formatUnits(requiredBalanceRaw, decimals),
      fundReady: commonReady,
      distributeReady: commonReady && vaultFunded,
      releaseReady: commonReady,
      blockers,
    });
  } catch {
    return res.status(503).json({ error: 'WRITE_STATUS_UNAVAILABLE' });
  }
}
