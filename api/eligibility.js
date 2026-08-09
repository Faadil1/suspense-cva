/**
 * GET /api/eligibility
 *
 * Returns per-holder results of the on-chain IATokenPolicy.canTransfer() call
 * for all 5 canonical demo cohort holders.
 *
 * Reality class: LIVE_POLICY_CHECK
 *   This endpoint calls the on-chain IATokenPolicy contract directly via eth_call.
 *   It does NOT call the Cleanverse REST API.
 *   The distinction matters:
 *     • LIVE_POLICY_CHECK = IATokenPolicy.canTransfer() on Monad Testnet
 *     • FRESH_CLEANVERSE_API_CHECK = Cleanverse REST endpoint (not implemented here)
 *
 * This is a pure read (eth_call). No transactions are submitted.
 * A display-only result is NOT authorization for any write operation.
 * The server re-runs canTransfer() immediately before every distribute/release.
 *
 * ── Amount used for canTransfer() ────────────────────────────────────────
 * The call mirrors SuspenseVault._policyAllows() exactly:
 *   policy.canTransfer(TOKEN_ADDRESS, VAULT_ADDRESS, holder, distributionAmount)
 * where distributionAmount = 1.0 SPNS03 = oneToken(liveDecimals).
 * Canonical: oneToken(6) = 1_000_000n
 *
 * token.decimals() is read fresh each request and validated against
 * TOKEN_DECIMALS_CANONICAL_HINT (6). Mismatch → DECIMALS_MISMATCH (fail-closed).
 *
 * ── Per-holder decision classification ───────────────────────────────────
 * A. canTransfer() returns true
 *    decision = "ALLOWED"   eligible = true
 *
 * B. canTransfer() returns false
 *    decision = "BLOCKED"   eligible = false
 *
 * C. EVM CALL_EXCEPTION (genuine policy revert with EVM revert data)
 *    decision = "BLOCKED"   eligible = false
 *    revertSelector included if first 4 bytes of revert data are available.
 *    Mirrors SuspenseVault._policyAllows() semantics.
 *
 * D. Infrastructure / network / provider failure (non-EVM error)
 *    decision = "UNKNOWN"   eligible = null
 *    error = "POLICY_CHECK_UNAVAILABLE"
 *    MUST NOT be presented as regulatory/compliance ineligibility.
 *    For transaction-producing endpoints: UNKNOWN must fail closed.
 *    No transaction may proceed if policy recheck returns UNKNOWN.
 *
 * ── Response completeness ─────────────────────────────────────────────────
 * If any holder has decision = "UNKNOWN", the top-level response includes:
 *   hasUnknownResults: true
 *   completenessNote: "<human-readable partial warning>"
 * This makes the incomplete reality explicit — UNKNOWN is never silently
 * converted to BLOCKED.
 *
 * Response fields:
 *   realityClass      — "LIVE_POLICY_CHECK"
 *   policyCallNote    — human-readable description of what was called
 *   chainId           — 10143 (verified server-side)
 *   isoTime           — ISO8601 wall-clock time of response
 *   policy            — policy contract address (display only)
 *   token             — token address used in canTransfer call (display only)
 *   vault             — vault address used as "from" in canTransfer (display only)
 *   tokenDecimals     — result of token.decimals() at call time
 *   checkAmount       — amount used in eligibility check (raw units string)
 *   hasUnknownResults — true if any holder returned UNKNOWN; absent if all resolved
 *   completenessNote  — present only when hasUnknownResults is true
 *   holders           — array of per-holder results
 *     .holder         — holder index (1-5)
 *     .address        — holder wallet address
 *     .country        — country code from Gate B evidence
 *     .cvRecord       — Cleanverse record ID from Gate B evidence
 *     .decision       — "ALLOWED" | "BLOCKED" | "UNKNOWN"
 *     .eligible       — true | false | null (null for UNKNOWN)
 *     .revertSelector — "0x12345678" (only for CALL_EXCEPTION with revert data)
 *     .error          — "POLICY_CHECK_UNAVAILABLE" (only for UNKNOWN)
 *
 * Security:
 *   - MONAD_RPC_URL read server-side only; never returned to client.
 *   - All addresses hardcoded; no client input reaches RPC calls.
 *   - No secrets in response body.
 *   - Raw error messages and provider internals never logged or returned.
 */

import { getContracts } from '../lib/rpc.js';
import { getRuntimeVaultAddress } from '../lib/write-context.js';
import {
  CHAIN_ID,
  VAULT_ADDRESS,
  TOKEN_ADDRESS,
  POLICY_ADDRESS,
  DEMO_COHORT,
  DISTRIBUTION_AMOUNT_TOKENS,
  REALITY,
  assertDecimalsMatch,
  oneToken,
} from '../lib/constants.js';

// ── Error code classification ──────────────────────────────────────────────
//
// Ethers v6 error codes for EVM CALL_EXCEPTION vs infrastructure failures.
// CALL_EXCEPTION = genuine EVM revert (policy decision).
// All others = infrastructure/transport errors (not a compliance decision).
const EVM_REVERT_CODE = 'CALL_EXCEPTION';
const INFRA_ERROR_CODES = new Set([
  'NETWORK_ERROR',
  'SERVER_ERROR',
  'TIMEOUT',
  'UNKNOWN_ERROR',
  'BUFFER_OVERRUN',
  'NUMERIC_FAULT',
  'MISSING_ARGUMENT',
  'UNEXPECTED_ARGUMENT',
]);

/**
 * Classify a per-holder canTransfer() error.
 *
 * Returns one of:
 *   { decision: 'BLOCKED', eligible: false, revertSelector?: string }
 *   { decision: 'UNKNOWN', eligible: null, error: 'POLICY_CHECK_UNAVAILABLE' }
 */
function classifyCallError(holderIndex, err) {
  const code = err.code;

  if (code === EVM_REVERT_CODE) {
    // Genuine EVM policy revert — treat as BLOCKED (mirrors _policyAllows semantics).
    // Extract the first 4 bytes of revert data as the selector, if present.
    let revertSelector = null;
    if (err.data && typeof err.data === 'string' && err.data.length >= 10) {
      revertSelector = err.data.slice(0, 10); // '0x' + 8 hex chars = 4 bytes
    }
    // Sanitized log: only holder index and normalized code — no raw message.
    console.error(`[eligibility] holder_${holderIndex} CALL_EXCEPTION`);
    return {
      decision: 'BLOCKED',
      eligible: false,
      ...(revertSelector ? { revertSelector } : {}),
    };
  }

  // Infrastructure/transport/provider failure — not a policy decision.
  // Sanitized log: normalized code only — no raw err.message or err.shortMessage.
  const normalizedCode = INFRA_ERROR_CODES.has(code) ? code : 'UNKNOWN';
  console.error(`[eligibility] holder_${holderIndex} POLICY_CHECK_UNAVAILABLE code=${normalizedCode}`);
  return {
    decision: 'UNKNOWN',
    eligible: null,
    error: 'POLICY_CHECK_UNAVAILABLE',
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { token, policy } = await getContracts();
    const runtimeVault = getRuntimeVaultAddress();
    if (!runtimeVault) {
      return res.status(503).json({
        realityClass: REALITY.LIVE_POLICY_CHECK,
        error: 'RUNTIME_VAULT_NOT_CONFIGURED',
        detail: 'SUSPENSE_RUNTIME_VAULT_ADDRESS must be configured for live runtime state.',
      });
    }

    // Read token decimals at request time; fail-closed if unexpected.
    const liveDecimals = Number(await token.decimals());
    assertDecimalsMatch(liveDecimals); // throws DECIMALS_MISMATCH if not 6

    const checkAmount = oneToken(liveDecimals) * DISTRIBUTION_AMOUNT_TOKENS;

    // Call canTransfer for each holder in parallel.
    // Mirrors SuspenseVault._policyAllows() exactly:
    //   policy.canTransfer(address(token), address(this[=vault]), recipient, amount)
    const results = await Promise.all(
      DEMO_COHORT.map(async (member) => {
        try {
          const result = await policy.canTransfer(
            TOKEN_ADDRESS,   // token
            runtimeVault,    // from (vault is the distributor)
            member.address,  // to (recipient/holder)
            checkAmount      // amount (1.0 SPNS03 = 1_000_000n at 6 decimals)
          );

          // canTransfer() returned a boolean.
          if (result === true) {
            return {
              holder:   member.holder,
              address:  member.address,
              country:  member.country,
              cvRecord: member.cvRecord,
              decision: 'ALLOWED',
              eligible: true,
            };
          } else {
            // Returned false (not a revert — policy explicitly denies).
            return {
              holder:   member.holder,
              address:  member.address,
              country:  member.country,
              cvRecord: member.cvRecord,
              decision: 'BLOCKED',
              eligible: false,
            };
          }
        } catch (callErr) {
          const classification = classifyCallError(member.holder, callErr);
          return {
            holder:   member.holder,
            address:  member.address,
            country:  member.country,
            cvRecord: member.cvRecord,
            ...classification,
          };
        }
      })
    );

    // Check if any holder returned UNKNOWN — make partial reality explicit.
    const hasUnknownResults = results.some(r => r.decision === 'UNKNOWN');

    const responseBody = {
      realityClass: REALITY.LIVE_POLICY_CHECK,
      policyCallNote: 'On-chain IATokenPolicy.canTransfer() via eth_call — not a Cleanverse REST API call',
      chainId: CHAIN_ID,
      isoTime: new Date().toISOString(),
      policy: POLICY_ADDRESS,
      token:  TOKEN_ADDRESS,
      vault:  runtimeVault,
      tokenDecimals: liveDecimals,
      checkAmount: checkAmount.toString(),
      holders: results,
    };

    if (hasUnknownResults) {
      responseBody.hasUnknownResults = true;
      responseBody.completenessNote =
        'One or more holders returned UNKNOWN — policy check was unavailable for those holders ' +
        'due to a network or provider failure. UNKNOWN is not equivalent to BLOCKED. ' +
        'Retry when the RPC endpoint is available.';
    }

    return res.status(200).json(responseBody);

  } catch (err) {
    // Top-level failures: chain mismatch, decimals mismatch, or provider setup failure.
    // Sanitized log — normalized code only, no raw error message.
    const isChainMismatch    = err.message?.startsWith('CHAIN_MISMATCH');
    const isDecimalsMismatch = err.message?.startsWith('DECIMALS_MISMATCH');

    if (isChainMismatch) {
      console.error('[eligibility] CHAIN_MISMATCH');
    } else if (isDecimalsMismatch) {
      console.error('[eligibility] DECIMALS_MISMATCH');
    } else {
      console.error('[eligibility] PROVIDER_SETUP_ERROR');
    }

    if (isDecimalsMismatch) {
      return res.status(503).json({
        realityClass: REALITY.LIVE_POLICY_CHECK,
        error: 'DECIMALS_MISMATCH',
        detail: 'Token decimals do not match canonical value. Update TOKEN_DECIMALS_CANONICAL_HINT.',
      });
    }

    return res.status(isChainMismatch ? 503 : 502).json({
      realityClass: REALITY.LIVE_POLICY_CHECK,
      error: isChainMismatch ? 'CHAIN_MISMATCH' : 'RPC_ERROR',
      detail: isChainMismatch
        ? 'Connected to wrong chain. Expected Monad Testnet (chainId 10143).'
        : 'Failed to query eligibility from Monad Testnet.',
    });
  }
}
