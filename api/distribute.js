import { Contract, Wallet } from 'ethers';
import {
  buildWriteContext,
  EXPECTED_DISTRIBUTE_SIGNER,
} from '../lib/write-context.js';
import { VAULT_ABI, TOKEN_ADDRESS, DEMO_COHORT } from '../lib/constants.js';
import { reserveOperationId, updateOperationState, OpState } from '../lib/replay.js';
import { checkRateLimit } from '../lib/ratelimit.js';
import { validateOrigin } from '../lib/origin.js';
import { requireSession } from '../lib/auth.js';
import { isPolicyGuardFailure } from '../lib/policy-guard.js';

function error(res, status, code, detail) {
  return res.status(status).json(detail ? { error: code, detail } : { error: code });
}

export async function handler(req, res, deps = {}) {
  const ctx = await buildWriteContext(req, res, {
    validateOriginFn: deps.validateOriginFn || validateOrigin,
    requireSessionFn: deps.requireSessionFn || requireSession,
    checkRateLimitFn: deps.checkRateLimitFn || checkRateLimit,
    reserveOperationIdFn: deps.reserveOperationIdFn || reserveOperationId,
    updateOperationStateFn: deps.updateOperationStateFn || updateOperationState,
    getContractsFn: deps.getContractsFn,
  });

  if (!ctx.ok) {
    return error(res, ctx.status, ctx.error);
  }

  const { dryRun, updateOperationStateFn, operationId, policy, runtimeVault, getTokenAmount, getAllocationIds, vault } = ctx;
  const amount = getTokenAmount(6);
  const allocationIds = getAllocationIds(operationId);
  const recipients = DEMO_COHORT.map((m) => m.address);
  const amounts = DEMO_COHORT.map(() => amount);

  if (dryRun) {
    return res.status(200).json({
      ok: true,
      dryRun: true,
      signer: EXPECTED_DISTRIBUTE_SIGNER,
      chainId: ctx.chainId,
      runtimeVault,
      historicalVault: ctx.historicalVault,
      allocationIds,
      recipients,
      amounts,
      noReservation: true,
      noSigning: true,
      noBroadcast: true,
    });
  }

  try {
    const signerSecret = process.env.SUSPENSE_DEMO_SIGNER_PRIVATE_KEY;
    const wallet = new Wallet(signerSecret, vault.runner.provider);
    const signer = await wallet.getAddress();
    if (signer.toLowerCase() !== EXPECTED_DISTRIBUTE_SIGNER.toLowerCase()) {
      return error(res, 503, 'SIGNER_MISMATCH');
    }

    const livePolicyResults = [];
    for (const member of DEMO_COHORT) {
      const allowed = await policy.canTransfer(TOKEN_ADDRESS, runtimeVault, member.address, amount);
      livePolicyResults.push({ holder: member.holder, decision: allowed ? 'ALLOWED' : 'BLOCKED' });
    }

    await updateOperationStateFn('distribute', operationId, OpState.SUBMITTED);
    const tx = await new Contract(runtimeVault, VAULT_ABI, wallet).distribute(allocationIds, recipients, amounts);
    const receipt = await tx.wait();
    await updateOperationStateFn('distribute', operationId, OpState.CONFIRMED);

    return res.status(200).json({
      ok: true,
      signer: EXPECTED_DISTRIBUTE_SIGNER,
      chainId: ctx.chainId,
      runtimeVault,
      historicalVault: ctx.historicalVault,
      allocationIds,
      recipients,
      amounts,
      txHash: receipt.hash,
      zeroBlockchainTransactions: false,
    });
  } catch (err) {
    await updateOperationStateFn('distribute', operationId, OpState.FAILED);
    if (isPolicyGuardFailure(err)) {
      return error(res, 503, 'POLICY_CHECK_UNAVAILABLE');
    }
    return error(res, 503, 'DISTRIBUTE_FAILED');
  }
}

export default handler;
