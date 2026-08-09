/**
 * GET /api/status
 *
 * Returns live vault state from Monad Testnet.
 *
 * Reality class: LIVE_CHAIN_STATE
 *
 * ── What this endpoint returns ────────────────────────────────────────────
 * This endpoint returns:
 *   - SPNS03 vault token balance (ERC20.balanceOf(vault))
 *   - Token metadata (symbol, decimals)
 *   - Current block number and timestamp
 *   - ChainId confirmation (always 10143)
 *
 * It does NOT return per-allocation state. Allocation state requires knowing
 * specific allocationIds (bytes32), which are created by distribute() in Phase D.
 * Allocation state will be included in a future endpoint once allocationIds exist.
 * See: GET /api/eligibility for per-holder policy checks.
 *
 * ── Decimals validation ────────────────────────────────────────────────────
 * token.decimals() is read and validated against TOKEN_DECIMALS_CANONICAL_HINT (6).
 * Mismatch → DECIMALS_MISMATCH error (fail-closed).
 * Canonical: 1.0 SPNS03 = 1,000,000 raw units (6 decimals).
 *
 * ── Log sanitization ──────────────────────────────────────────────────────
 * console.error writes normalized error codes only. Raw err.message,
 * err.stack, provider internals, and RPC URLs are never logged.
 *
 * Response fields:
 *   realityClass    — "LIVE_CHAIN_STATE"
 *   chainId         — 10143 (verified server-side; rejected otherwise)
 *   blockNumber     — current Monad Testnet block
 *   timestamp       — current block timestamp (Unix seconds)
 *   isoTime         — ISO8601 wall-clock time of response
 *   vault           — vault address (display only)
 *   token           — token address (display only)
 *   vaultBalance    — SPNS03 balance of vault, human-readable (e.g. "5.0")
 *   vaultBalanceRaw — vault balance in raw units (string)
 *   tokenSymbol     — e.g. "SPNS03"
 *   tokenDecimals   — result of token.decimals() at call time
 *
 * Security:
 *   - MONAD_RPC_URL read server-side only; never returned to client.
 *   - All contract addresses hardcoded; no client input reaches RPC calls.
 *   - No secrets in response body.
 *   - chainId verified before any data is returned.
 *   - Raw error messages and provider internals never logged or returned.
 */

import { formatUnits } from 'ethers';
import { getContracts } from '../lib/rpc.js';
import { getRuntimeVaultAddress } from '../lib/write-context.js';
import {
  CHAIN_ID,
  VAULT_ADDRESS,
  TOKEN_ADDRESS,
  REALITY,
  assertDecimalsMatch,
} from '../lib/constants.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { provider, token } = await getContracts();
    const runtimeVault = getRuntimeVaultAddress();
    if (!runtimeVault) {
      return res.status(503).json({
        realityClass: REALITY.LIVE_CHAIN_STATE,
        error: 'RUNTIME_VAULT_NOT_CONFIGURED',
        detail: 'SUSPENSE_RUNTIME_VAULT_ADDRESS must be configured for live runtime state.',
      });
    }

    // Parallel reads — pure eth_call, no state mutation
    const [
      vaultBalanceRaw,
      tokenSymbol,
      liveDecimalsRaw,
      blockNumber,
    ] = await Promise.all([
      token.balanceOf(runtimeVault),
      token.symbol(),
      token.decimals(),
      provider.getBlockNumber(),
    ]);

    const liveDecimals = Number(liveDecimalsRaw);
    assertDecimalsMatch(liveDecimals); // fail-closed if not canonical value of 6

    const vaultBalance = formatUnits(vaultBalanceRaw, liveDecimals);

    // Get block for timestamp
    const block = await provider.getBlock(blockNumber);
    const blockTimestamp = block ? Number(block.timestamp) : null;

    // Build response — no secrets, no RPC URL
    return res.status(200).json({
      realityClass: REALITY.LIVE_CHAIN_STATE,
      chainId: CHAIN_ID,
      blockNumber,
      timestamp: blockTimestamp,
      isoTime: new Date().toISOString(),
      vault: runtimeVault,
      token: TOKEN_ADDRESS,
      vaultBalance,
      vaultBalanceRaw: vaultBalanceRaw.toString(),
      tokenSymbol,
      tokenDecimals: liveDecimals,
    });
  } catch (err) {
    // Classify error using internal flags only — do not log raw err.message.
    const isChainMismatch    = err.message?.startsWith('CHAIN_MISMATCH');
    const isDecimalsMismatch = err.message?.startsWith('DECIMALS_MISMATCH');

    // Sanitized log: normalized code only — no raw error payload.
    if (isChainMismatch) {
      console.error('[status] CHAIN_MISMATCH');
    } else if (isDecimalsMismatch) {
      console.error('[status] DECIMALS_MISMATCH');
    } else {
      console.error('[status] RPC_ERROR');
    }

    if (isDecimalsMismatch) {
      return res.status(503).json({
        realityClass: REALITY.LIVE_CHAIN_STATE,
        error: 'DECIMALS_MISMATCH',
        detail: 'Token decimals do not match canonical value. Update TOKEN_DECIMALS_CANONICAL_HINT.',
      });
    }

    return res.status(isChainMismatch ? 503 : 502).json({
      realityClass: REALITY.LIVE_CHAIN_STATE,
      error: isChainMismatch ? 'CHAIN_MISMATCH' : 'RPC_ERROR',
      detail: isChainMismatch
        ? 'Connected to wrong chain. Expected Monad Testnet (chainId 10143).'
        : 'Failed to fetch live chain state. Monad Testnet may be unreachable.',
    });
  }
}
