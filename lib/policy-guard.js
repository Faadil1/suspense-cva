export function assertPolicyKnown(policyResult) {
  if (!policyResult || policyResult.decision === 'UNKNOWN') {
    throw Object.assign(new Error('POLICY_CHECK_UNAVAILABLE'), { policyGuardFailed: true, code: 'POLICY_CHECK_UNAVAILABLE' });
  }
}
export function isPolicyAllowed(policyResult) {
  assertPolicyKnown(policyResult);
  return policyResult.decision === 'ALLOWED';
}
export function isPolicyGuardFailure(err) {
  return !!(err && typeof err === 'object' && err.policyGuardFailed === true);
}
