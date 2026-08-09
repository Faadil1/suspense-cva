/**
 * api/lib/auth.js
 *
 * Stateless HMAC-SHA256 session token utilities.
 *
 * Token format:
 *   base64url(payload) + "." + base64url(HMAC-SHA256(payload, secret))
 *
 * Payload: JSON.stringify({ iss: "suspense-cva", exp: <unix-seconds>, v: 1 })
 *
 * ── Security properties ────────────────────────────────────────────────────
 * - Signature verified with timing-safe comparison (crypto.timingSafeEqual).
 * - Secret never returned to client, never logged.
 * - Token contains no secrets — payload is issuer/expiry/version only.
 * - String equality uses timing-safe comparison (OPERATOR_AUTH_SECRET check).
 * - Secret configuration validated at request time:
 *     missing            → AUTH_NOT_CONFIGURED (503)
 *     < 32 UTF-8 bytes   → AUTH_CONFIG_INVALID (503)
 *   Secret length, value, and entropy are never returned or logged.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const ISSUER = 'suspense-cva';
const VERSION = 1;
export const SESSION_MAX_AGE = 600; // seconds

// ── Base64url helpers ──────────────────────────────────────────────────────

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function b64urlDecode(str) {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// ── HMAC ──────────────────────────────────────────────────────────────────

function hmacSha256(data, secret) {
  return createHmac('sha256', secret).update(data).digest();
}

// ── Token creation ─────────────────────────────────────────────────────────

/**
 * Create a signed session token.
 *
 * @param {string} secret — OPERATOR_AUTH_SECRET (never logged)
 * @returns {string} signed session token
 */
export function createSessionToken(secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    iss: ISSUER,
    exp: now + SESSION_MAX_AGE,
    v:   VERSION,
  });
  const payloadEncoded = b64url(payload);
  const sig = b64url(hmacSha256(payloadEncoded, secret));
  return `${payloadEncoded}.${sig}`;
}

// ── Token verification ─────────────────────────────────────────────────────

/**
 * Verify a session token.
 *
 * @param {string} token
 * @param {string} secret — OPERATOR_AUTH_SECRET
 * @returns {{ valid: boolean, reason?: string }}
 */
export function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'MISSING_TOKEN' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'MALFORMED_TOKEN' };
  }

  const [payloadEncoded, sigEncoded] = parts;

  // Decode provided signature.
  let actualSig;
  try {
    actualSig = b64urlDecode(sigEncoded);
  } catch {
    return { valid: false, reason: 'MALFORMED_SIGNATURE' };
  }

  // Compute expected signature.
  const expectedSig = hmacSha256(payloadEncoded, secret);

  // Length mismatch — constant-time reject (avoid timing leak via branch).
  if (expectedSig.length !== actualSig.length) {
    timingSafeEqual(expectedSig, expectedSig); // dummy same-length call
    return { valid: false, reason: 'SIGNATURE_INVALID' };
  }

  // Timing-safe comparison.
  if (!timingSafeEqual(expectedSig, actualSig)) {
    return { valid: false, reason: 'SIGNATURE_INVALID' };
  }

  // Decode and validate payload claims.
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadEncoded).toString('utf8'));
  } catch {
    return { valid: false, reason: 'MALFORMED_PAYLOAD' };
  }

  if (payload.iss !== ISSUER)  return { valid: false, reason: 'INVALID_ISSUER'  };
  if (payload.v   !== VERSION) return { valid: false, reason: 'INVALID_VERSION' };

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    return { valid: false, reason: 'TOKEN_EXPIRED' };
  }

  return { valid: true };
}

// ── Credential comparison ──────────────────────────────────────────────────

/**
 * Compare two strings in constant time.
 * Returns true only if both are equal-length and byte-identical.
 *
 * Used for OPERATOR_AUTH_SECRET validation.
 * Never logs either argument.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeStringEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  // Different lengths are inherently unequal.
  // Still call timingSafeEqual to avoid timing differences from early return.
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf); // dummy — same buffer, same length
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

// ── Secret configuration validation ───────────────────────────────────────

/** Minimum OPERATOR_AUTH_SECRET length in UTF-8 bytes. */
const SECRET_MIN_BYTES = 32;

/**
 * Validate that OPERATOR_AUTH_SECRET meets the minimum configuration
 * requirements before any cryptographic operation is performed.
 *
 * ── Contract ──────────────────────────────────────────────────────────────
 * missing secret                        → { valid: false, error: 'AUTH_NOT_CONFIGURED' }
 * Buffer.byteLength(secret, 'utf8') < 32 → { valid: false, error: 'AUTH_CONFIG_INVALID' }
 * ≥ 32 UTF-8 bytes                      → { valid: true }
 *
 * ── Never logged or returned ──────────────────────────────────────────────
 * - Secret value
 * - Secret length
 * - Entropy estimate
 *
 * Only normalized error codes are logged. Callers return 503 on invalid.
 *
 * @param {string|undefined} secret — value of OPERATOR_AUTH_SECRET
 * @param {string} logPrefix — normalized log prefix, e.g. '[auth]' or '[session]'
 * @returns {{ valid: boolean, error?: 'AUTH_NOT_CONFIGURED' | 'AUTH_CONFIG_INVALID' }}
 */
export function validateSecretConfig(secret, logPrefix = '[auth]') {
  if (!secret) {
    console.error(`${logPrefix} AUTH_NOT_CONFIGURED`);
    return { valid: false, error: 'AUTH_NOT_CONFIGURED' };
  }
  if (Buffer.byteLength(secret, 'utf8') < SECRET_MIN_BYTES) {
    // Length and value are never logged — normalized code only.
    console.error(`${logPrefix} AUTH_CONFIG_INVALID`);
    return { valid: false, error: 'AUTH_CONFIG_INVALID' };
  }
  return { valid: true };
}

// ── Session cookie parsing ─────────────────────────────────────────────────

/**
 * Extract the session token from the Cookie header.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {string|null}
 */
export function extractSessionCookie(req) {
  const cookieHeader = req.headers['cookie'];
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Reusable session guard for privileged POST endpoints.
 *
 * Call at the top of distribute/release handlers.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {{ proceed: boolean }} If proceed is false, the response is already set.
 */
export function requireSession(req, res) {
  const operatorSecret = process.env.OPERATOR_AUTH_SECRET;
  const secretCheck = validateSecretConfig(operatorSecret, '[session]');
  if (!secretCheck.valid) {
    res.status(503).json({ error: secretCheck.error });
    return { proceed: false };
  }

  const token = extractSessionCookie(req);
  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', detail: 'No session cookie' });
    return { proceed: false };
  }

  const result = verifySessionToken(token, operatorSecret);
  if (!result.valid) {
    // Sanitized log — reason code only, no token value.
    console.error(`[session] TOKEN_INVALID reason=${result.reason}`);
    res.status(401).json({ error: 'UNAUTHORIZED', detail: result.reason });
    return { proceed: false };
  }

  return { proceed: true };
}
