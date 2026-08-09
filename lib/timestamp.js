const DEFAULT_WINDOW_SECONDS = 30;
export function validateTimestamp(ts, windowSeconds = DEFAULT_WINDOW_SECONDS) {
  const parsed = Number(ts);
  if (!Number.isFinite(parsed) || parsed <= 0) return { valid: false, reason: 'INVALID_TIMESTAMP_FORMAT' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const delta = Math.abs(nowSeconds - parsed);
  if (delta > windowSeconds) return { valid: false, reason: 'TIMESTAMP_OUT_OF_WINDOW' };
  return { valid: true };
}
