import { Contract, Wallet } from 'ethers';
import {
  buildWriteContext,
  EXPECTED_DISTRIBUTE_SIGNER,
} from '../lib/write-context.js';
import { VAULT_ABI, TOKEN_ADDRESS } from '../lib/constants.js';
import { reserveOperationId, updateOperationState, OpState } from '../lib/replay.js';
import { checkRateLimit } from '../lib/ratelimit.js';
import { validateOrigin } from '../lib/origin.js';
import { requireSession } from '../lib/auth.js';

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
    scope: 'release',
  });

  if (!ctx.ok) return error(res, ctx.status, ctx.error);

  const operationId = req.body?.operationId;
  const allocationId = req.body?.allocationId;
  if (!allocationId || typeof allocationId !== 'string') {
    if (!ctx.dryRun) await ctx.updateOperationStateFn(ctx.operationScope, operationId, OpState.FAILED);
    return error(res, 400, 'INVALID_REQUEST', 'allocationId required');
  }

  if (ctx.dryRun) {
    return res.status(200).json({
      ok: true, dryRun: true, signer: EXPECTED_DISTRIBUTE_SIGNER,
      chainId: ctx.chainId, runtimeVault: ctx.runtimeVault,
      historicalVault: ctx.historicalVault, allocationId,
      writeGateMode: ctx.writeGateMode,
      noReservation: true, noSigning: true, noBroadcast: true,
    });
  }

  try {
    const signerSecret = process.env.SUSPENSE_DEMO_SIGNER_PRIVATE_KEY;
    if (!signerSecret) {
      await ctx.updateOperationStateFn(ctx.operationScope, operationId, OpState.FAILED);
      return error(res, 503, 'SIGNER_NOT_CONFIGURED');
    }

    const wallet = new Wallet(signerSecret, ctx.vault.runner.provider);
    const signer = await wallet.getAddress();
    if (signer.toLowerCase() !== EXPECTED_DISTRIBUTE_SIGNER.toLowerCase()) {
      await ctx.updateOperationStateFn(ctx.operationScope, operationId, OpState.FAILED);
      return error(res, 503, 'SIGNER_MISMATCH');
    }

    const contract = new Contract(ctx.runtimeVault, VAULT_ABI, wallet);
    const allocation = await contract.allocations(allocationId);
    if (Number(allocation.state) !== 3) {
      await ctx.updateOperationStateFn(ctx.operationScope, operationId, OpState.FAILED);
      return error(res, 409, 'NOT_SUSPENDED');
    }

    const allowed = await ctx.policy.canTransfer(
      TOKEN_ADDRESS, ctx.runtimeVault, allocation.recipient, allocation.amount
    );
    if (!allowed) {
      await ctx.updateOperationStateFn(ctx.operationScope, operationId, OpState.FAILED);
      return error(res, 409, 'STILL_BLOCKED');
    }

    await ctx.updateOperationStateFn(ctx.operationScope, operationId, OpState.SUBMITTED);
    const tx = await contract.release(allocationId);
    const receipt = await tx.wait();
    await ctx.updateOperationStateFn(ctx.operationScope, operationId, OpState.CONFIRMED);

    return res.status(200).json({
      ok: true, signer: EXPECTED_DISTRIBUTE_SIGNER, chainId: ctx.chainId,
      runtimeVault: ctx.runtimeVault, historicalVault: ctx.historicalVault,
      allocationId, writeGateMode: ctx.writeGateMode,
      txHash: receipt.hash, blockNumber: receipt.blockNumber,
      zeroBlockchainTransactions: false,
    });
  } catch {
    await ctx.updateOperationStateFn(ctx.operationScope, operationId, OpState.FAILED);
    return error(res, 503, 'RELEASE_FAILED');
  }
}

export default handler;
