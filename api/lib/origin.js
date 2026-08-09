/**
 * api/lib/origin.js
 *
 * Server-side Origin header validation for privileged POST endpoints.
 *
 * ── Why this matters ──────────────────────────────────────────────────────
 * vercel.json provides no CORS headers on write endpoints (/api/auth,
 * /api/distribute, /api/release), so cross-origin browser requests are
 * already blocked at the network layer (no preflight response). This
 * server-side check is defense-in-depth for:
 *   1. Non-browser clients that send an Origin header anyway.
 *   2. Future environment changes that might affect vercel.json CORS rules.
 *
 * The session cookie is SameSite=Strict — primary CSRF guard.
 * This Origin check is defense-in-depth layer 2.
 *
 * ── Rules ─────────────────────────────────────────────────────────────────
 * 1. Origin header absent → allowed (same-origin browser request; server-side
 *    callers such as curl or internal services rarely send Origin).
 * 2. ALLOWED_ORIGIN not configured → if Origin is present → 403 (fail-closed).
 * 3. Origin present and matches ALLOWED_ORIGIN → allowed.
 * 4. Origin present and does NOT match ALLOWED_ORIGIN → 403.
 *
 * ── Configuration ─────────────────────────────────────────────────────────
 * Set ALLOWED_ORIGIN to the full deployment origin, e.g.:
 *   ALLOWED_ORIGIN=https://suspense-cva.vercel.app
 *
 * ── Security ──────────────────────────────────────────────────────────────
 * - Does NOT trust Host or X-Forwarded-Host as the allowed origin.
 * - Raw Origin value never logged — only a normalized mismatch code.
 */

/**
 * Validate the Origin header on a privileged POST request.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateOrigin(req) {
  const origin = req.headers['origin'];

  // No Origin header — allowed (same-origin or server-side caller).
  if (!origin) {
    return { valid: true };
  }

  const allowedOrigin = process.env.ALLOWED_ORIGIN;

  // Origin present but ALLOWED_ORIGIN not configured — fail-closed.
  if (!allowedOrigin) {
    console.error('[origin] ALLOWED_ORIGIN_NOT_CONFIGURED');
    return { valid: false, reason: 'ORIGIN_NOT_CONFIGURED' };
  }

  // Exact match required (no wildcard, no suffix match).
  if (origin !== allowedOrigin) {
    // Normalized log — no raw origin value in log output.
    console.error('[origin] ORIGIN_MISMATCH');
    return { valid: false, reason: 'ORIGIN_MISMATCH' };
  }

  return { valid: true };
}
