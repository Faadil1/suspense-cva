/**
 * api/lib/policy-guard.js
 *
 * UNKNOWN policy result fail-closed guard.
 *
 * ── Contract ──────────────────────────────────────────────────────────────
 * Transaction-producing endpoints (distribute, release) MUST call assertPolicyKnown()
 * after every fresh canTransfer() check. If the policy result is UNKNOWN
 * (infrastructure/transport failure — not a policy decision), no transaction
 * may proceed.
 *
 * ── Decision classification (mirrors eligibility.js) ─────────────────────
 *   ALLOWED  — canTransfer() returned true → eligible
 *   BLOCKED  — canTransfer() returned false OR EVM CALL_EXCEPTION → ineligible
 *   UNKNOWN  — infrastructure failure (POLICY_CHECK_UNAVAILABLE)
 *              → MUST fail-closed; NOT equivalent to BLOCKED
 *
 * ── Why UNKNOWN must fail closed ──────────────────────────────────────────
 * UNKNOWN means the check could not be performed — not that the holder is
 * ineligible. Treating UNKNOWN as BLOCKED would be incorrect (regulatory
 * ineligibility must be a real policy decision, not an infrastructure error).
 * Treating UNKNOWN as ALLOWED would bypass compliance entirely. The only safe
 * choice is to refuse the transaction until a known result is obtained.
 */

/**
 * Assert that a fresh policy check result is ALLOWED or BLOCKED (known).
 * Throws a structured error if the result is UNKNOWN or absent.
 *
 * The caller receives a 503 response; the transaction is not submitted.
 *
 * @param {{ decision: 'ALLOWED' | 'BLOCKED' | 'UNKNOWN' } | null} policyResult
 * @throws {{ policyGuardFailed: true, code: 'POLICY_CHECK_UNAVAILABLE' }}
 */
export function assertPolicyKnown(policyResult) {
  if (!policyResult || policyResult.decision === 'UNKNOWN') {
    throw Object.assign(
      new Error('POLICY_CHECK_UNAVAILABLE'),
      { policyGuardFailed: true, code: 'POLICY_CHECK_UNAVAILABLE' }
    );
  }
}

/**
 * Return true if the policy result is ALLOWED (and known).
 * Calls assertPolicyKnown() first — throws on UNKNOWN.
 *
 * @param {{ decision: string }} policyResult
 * @returns {boolean}
 */
export function isPolicyAllowed(policyResult) {
  assertPolicyKnown(policyResult);
  return policyResult.decision === 'ALLOWED';
}

/**
 * Check if an error thrown by assertPolicyKnown() represents a guard failure.
 * Use in catch blocks of distribute/release to produce a 503 response.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
export function isPolicyGuardFailure(err) {
  return !!(err && typeof err === 'object' && err.policyGuardFailed === true);
}
