import { Contract, Wallet, formatUnits } from 'ethers';
import {
  buildWriteContext,
  EXPECTED_DISTRIBUTE_SIGNER,
} from '../lib/write-context.js';
import {
  ERC20_ABI,
  TOKEN_ADDRESS,
  DEMO_COHORT,
  oneToken,
} from '../lib/constants.js';
import { reserveOperationId, updateOperationState, OpState } from '../lib/replay.js';
import { checkRateLimit } from '../lib/ratelimit.js';
import { validateOrigin } from '../lib/origin.js';
import { requireSession } from '../lib/auth.js';

function error(res, status, code, detail) {
  return res.status(status).json(detail ? { error: code, detail } : { error: code });
}

export default async function handler(req, res) {
  const ctx = await buildWriteContext(req, res, {
    validateOriginFn: validateOrigin,
    requireSessionFn: requireSession,
    checkRateLimitFn: checkRateLimit,
    reserveOperationIdFn: reserveOperationId,
    updateOperationStateFn: updateOperationState,
    scope: 'fund',
  });

  if (!ctx.ok) return error(res, ctx.status, ctx.error);

  try {
    const decimals = Number(await ctx.token.decimals());
    const symbol = await ctx.token.symbol();
    const requiredRaw = BigInt(DEMO_COHORT.length) * oneToken(decimals);
    const beforeRaw = await ctx.token.balanceOf(ctx.runtimeVault);
    const mintRaw = beforeRaw >= requiredRaw ? 0n : requiredRaw - beforeRaw;

    if (ctx.dryRun) {
      return res.status(200).json({
        ok: true, dryRun: true, chainId: ctx.chainId, symbol,
        runtimeVault: ctx.runtimeVault, signer: EXPECTED_DISTRIBUTE_SIGNER,
        vaultBalanceRaw: beforeRaw.toString(), vaultBalance: formatUnits(beforeRaw, decimals),
        requiredRaw: requiredRaw.toString(), required: formatUnits(requiredRaw, decimals),
        mintRaw: mintRaw.toString(), mintAmount: formatUnits(mintRaw, decimals),
        writeGateMode: ctx.writeGateMode, noSigning: true, noBroadcast: true,
      });
    }

    if (mintRaw === 0n) {
      await ctx.updateOperationStateFn(ctx.operationScope, ctx.operationId, OpState.CONFIRMED);
      return res.status(200).json({
        ok: true, alreadyFunded: true, symbol, runtimeVault: ctx.runtimeVault,
        vaultBalanceRaw: beforeRaw.toString(), txHash: null,
        zeroBlockchainTransactions: true,
      });
    }

    const signerSecret = process.env.SUSPENSE_DEMO_SIGNER_PRIVATE_KEY;
    if (!signerSecret) {
      await ctx.updateOperationStateFn(ctx.operationScope, ctx.operationId, OpState.FAILED);
      return error(res, 503, 'SIGNER_NOT_CONFIGURED');
    }

    const wallet = new Wallet(signerSecret, ctx.vault.runner.provider);
    const signer = await wallet.getAddress();
    if (signer.toLowerCase() !== EXPECTED_DISTRIBUTE_SIGNER.toLowerCase()) {
      await ctx.updateOperationStateFn(ctx.operationScope, ctx.operationId, OpState.FAILED);
      return error(res, 503, 'SIGNER_MISMATCH');
    }

    const token = new Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);
    await token.mint.staticCall(ctx.runtimeVault, mintRaw);

    await ctx.updateOperationStateFn(ctx.operationScope, ctx.operationId, OpState.SUBMITTED);
    const tx = await token.mint(ctx.runtimeVault, mintRaw);
    const receipt = await tx.wait();
    await ctx.updateOperationStateFn(ctx.operationScope, ctx.operationId, OpState.CONFIRMED);

    const afterRaw = await ctx.token.balanceOf(ctx.runtimeVault);
    return res.status(200).json({
      ok: true, chainId: ctx.chainId, symbol,
      signer: EXPECTED_DISTRIBUTE_SIGNER, runtimeVault: ctx.runtimeVault,
      mintedRaw: mintRaw.toString(), minted: formatUnits(mintRaw, decimals),
      vaultBalanceBeforeRaw: beforeRaw.toString(), vaultBalanceAfterRaw: afterRaw.toString(),
      writeGateMode: ctx.writeGateMode, txHash: receipt.hash,
      blockNumber: receipt.blockNumber, zeroBlockchainTransactions: false,
    });
  } catch {
    if (!ctx.dryRun) {
      await ctx.updateOperationStateFn(ctx.operationScope, ctx.operationId, OpState.FAILED);
    }
    return error(res, 503, 'FUND_FAILED');
  }
}
