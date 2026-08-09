import { createHmac, timingSafeEqual } from 'node:crypto';

const ISSUER = 'suspense-cva';
const VERSION = 1;
export const SESSION_MAX_AGE = 600;

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(str) {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function hmacSha256(data, secret) {
  return createHmac('sha256', secret).update(data).digest();
}

export function createSessionToken(secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ iss: ISSUER, exp: now + SESSION_MAX_AGE, v: VERSION });
  const payloadEncoded = b64url(payload);
  const sig = b64url(hmacSha256(payloadEncoded, secret));
  return `${payloadEncoded}.${sig}`;
}

export function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string') return { valid: false, reason: 'MISSING_TOKEN' };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'MALFORMED_TOKEN' };
  const [payloadEncoded, sigEncoded] = parts;
  let actualSig;
  try { actualSig = b64urlDecode(sigEncoded); } catch { return { valid: false, reason: 'MALFORMED_SIGNATURE' }; }
  const expectedSig = hmacSha256(payloadEncoded, secret);
  if (expectedSig.length !== actualSig.length) {
    timingSafeEqual(expectedSig, expectedSig);
    return { valid: false, reason: 'SIGNATURE_INVALID' };
  }
  if (!timingSafeEqual(expectedSig, actualSig)) return { valid: false, reason: 'SIGNATURE_INVALID' };
  let payload;
  try { payload = JSON.parse(b64urlDecode(payloadEncoded).toString('utf8')); } catch { return { valid: false, reason: 'MALFORMED_PAYLOAD' }; }
  if (payload.iss !== ISSUER) return { valid: false, reason: 'INVALID_ISSUER' };
  if (payload.v !== VERSION) return { valid: false, reason: 'INVALID_VERSION' };
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) return { valid: false, reason: 'TOKEN_EXPIRED' };
  return { valid: true };
}

export function timingSafeStringEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

const SECRET_MIN_BYTES = 32;

export function validateSecretConfig(secret, logPrefix = '[auth]') {
  if (!secret) {
    console.error(`${logPrefix} AUTH_NOT_CONFIGURED`);
    return { valid: false, error: 'AUTH_NOT_CONFIGURED' };
  }
  if (Buffer.byteLength(secret, 'utf8') < SECRET_MIN_BYTES) {
    console.error(`${logPrefix} AUTH_CONFIG_INVALID`);
    return { valid: false, error: 'AUTH_CONFIG_INVALID' };
  }
  return { valid: true };
}

export function extractSessionCookie(req) {
  const cookieHeader = req.headers['cookie'];
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? match[1] : null;
}

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
    console.error(`[session] TOKEN_INVALID reason=${result.reason}`);
    res.status(401).json({ error: 'UNAUTHORIZED', detail: result.reason });
    return { proceed: false };
  }
  return { proceed: true };
}
