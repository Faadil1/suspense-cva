/**
 * POST /api/auth
 *
 * Validates the operator credential and issues a short-lived HttpOnly session
 * cookie. The cookie is used by future Phase D/E write endpoints.
 *
 * Reality class: AUTH (not a chain read; no RPC calls)
 *
 * ── Security properties ────────────────────────────────────────────────────
 * - OPERATOR_AUTH_SECRET never returned to client, never logged.
 * - Input "secret" never logged — only the outcome (ACCEPTED / REJECTED).
 * - Constant-time comparison (crypto.timingSafeEqual via timingSafeStringEqual).
 * - Rate limited: 10 requests / 60s / IP (Upstash Redis — instance-independent).
 * - Redis unavailable → 503 SERVICE_UNAVAILABLE (fail-closed).
 * - Origin validated server-side (defense-in-depth layer 2 beyond SameSite=Strict).
 * - Cookie: HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age=600.
 * - No localStorage, no sessionStorage, no query-string credentials.
 * - Token is stateless HMAC-SHA256 — no server-side session store required.
 *
 * ── Environment variables (server-side only) ──────────────────────────────
 *   OPERATOR_AUTH_SECRET  — required; ≥32 bytes entropy
 *   UPSTASH_REDIS_REST_URL     — required for rate limiting
 *   UPSTASH_REDIS_REST_TOKEN   — required for rate limiting
 *   ALLOWED_ORIGIN        — optional; if set, Origin header is enforced
 *
 * ── Response codes ────────────────────────────────────────────────────────
 * 200  { ok: true }                         + Set-Cookie header
 * 400  { error: 'INVALID_REQUEST' }         malformed body
 * 401  { error: 'UNAUTHORIZED' }            wrong secret
 * 403  { error: 'ORIGIN_REJECTED' }         Origin mismatch
 * 405  { error: 'Method Not Allowed' }      non-POST
 * 429  { error: 'RATE_LIMITED' }            too many attempts
 * 503  { error: 'RATE_LIMIT_UNAVAILABLE' }  Redis unavailable
 * 503  { error: 'AUTH_NOT_CONFIGURED' }     OPERATOR_AUTH_SECRET not set
 */

import {
  createSessionToken,
  timingSafeStringEqual,
  validateSecretConfig,
  SESSION_MAX_AGE,
} from '../lib/auth.js';
import { checkRateLimit }  from '../lib/ratelimit.js';
import { validateOrigin }  from '../lib/origin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── Origin validation (defense-in-depth) ──────────────────────────────
  const originCheck = validateOrigin(req);
  if (!originCheck.valid) {
    return res.status(403).json({ error: 'ORIGIN_REJECTED' });
  }

  // ── Rate limiting (per IP, instance-independent via Upstash) ──────────
  // Extract client IP from Vercel's forwarded header.
  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';

  const rateResult = await checkRateLimit(ip, 'auth');
  if (!rateResult.allowed) {
    const status = rateResult.status === 503 ? 503 : 429;
    const error  = status === 503 ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED';
    console.error(`[auth] ${error}`);
    return res.status(status).json({ error });
  }

  // ── Body validation ────────────────────────────────────────────────────
  const body = req.body;
  if (
    !body
    || typeof body !== 'object'
    || typeof body.secret !== 'string'
    || body.secret.length === 0
  ) {
    return res.status(400).json({
      error:  'INVALID_REQUEST',
      detail: 'Body must be { "secret": "<string>" }',
    });
  }

  // ── Secret configuration validation ───────────────────────────────────
  // Validates presence and minimum byte length (≥32 UTF-8 bytes).
  // AUTH_NOT_CONFIGURED if missing; AUTH_CONFIG_INVALID if < 32 bytes.
  // Secret value, length, and entropy are never logged or returned.
  const operatorSecret = process.env.OPERATOR_AUTH_SECRET;
  const secretCheck = validateSecretConfig(operatorSecret, '[auth]');
  if (!secretCheck.valid) {
    return res.status(503).json({ error: secretCheck.error });
  }

  // ── Credential validation (timing-safe) ───────────────────────────────
  const credentialValid = timingSafeStringEqual(body.secret, operatorSecret);
  // Secret never logged — outcome only.
  if (!credentialValid) {
    console.error('[auth] CREDENTIAL_REJECTED');
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  // ── Issue session cookie ───────────────────────────────────────────────
  const token = createSessionToken(operatorSecret);

  res.setHeader('Set-Cookie', [
    `session=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${SESSION_MAX_AGE}`,
  ].join('; '));

  // Minimal response — no token value, no secret, no debug info.
  return res.status(200).json({ ok: true });
}
