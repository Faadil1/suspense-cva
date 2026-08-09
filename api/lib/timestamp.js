/**
 * api/lib/timestamp.js
 *
 * Client-supplied timestamp validation.
 *
 * ── Role ──────────────────────────────────────────────────────────────────
 * Defense-in-depth only — does NOT replace operationId replay protection.
 * operationId reservation (SET NX EX via Redis) is the primary replay control.
 * Timestamp validation provides an additional temporal guard against stale
 * requests that somehow carry a valid (but old) session cookie.
 *
 * ── Contract ──────────────────────────────────────────────────────────────
 * Expected format: Unix timestamp in seconds (number or numeric string).
 * Allowed drift:   ±30 seconds (configurable per call).
 */

const DEFAULT_WINDOW_SECONDS = 30;

/**
 * Validate that a client-supplied timestamp is within an acceptable window
 * of the server's current time.
 *
 * @param {number|string} ts            — client-supplied Unix timestamp (seconds)
 * @param {number}        windowSeconds — allowed drift in seconds (default 30)
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateTimestamp(ts, windowSeconds = DEFAULT_WINDOW_SECONDS) {
  const parsed = Number(ts);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { valid: false, reason: 'INVALID_TIMESTAMP_FORMAT' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const delta      = Math.abs(nowSeconds - parsed);

  if (delta > windowSeconds) {
    return { valid: false, reason: 'TIMESTAMP_OUT_OF_WINDOW' };
  }

  return { valid: true };
}
