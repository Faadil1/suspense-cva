import {
  createWriteArmToken,
  WRITE_ARM_MAX_AGE,
  requireSession,
} from '../lib/auth.js';
import { validateOrigin } from '../lib/origin.js';
import { checkRateLimit } from '../lib/ratelimit.js';

export const WRITE_ARM_CONFIRMATION = 'ARM MONAD TESTNET WRITES';

function fail(res, status, error) {
  return res.status(status).json({ error });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method Not Allowed');

  const origin = validateOrigin(req);
  if (!origin.valid) return fail(res, 403, 'ORIGIN_REJECTED');

  const session = requireSession(req, res);
  if (!session.proceed) return;

  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';
  const rate = await checkRateLimit(ip, 'write-arm');
  if (!rate.allowed) {
    return fail(res, rate.status === 503 ? 503 : 429, rate.status === 503 ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED');
  }

  if (req.body?.confirm !== WRITE_ARM_CONFIRMATION) {
    return fail(res, 400, 'WRITE_ARM_CONFIRMATION_REQUIRED');
  }

  const operatorSecret = process.env.OPERATOR_AUTH_SECRET;
  const token = createWriteArmToken(operatorSecret);
  res.setHeader('Set-Cookie', [
    `write_arm=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${WRITE_ARM_MAX_AGE}`,
  ].join('; '));

  return res.status(200).json({
    ok: true,
    writeArm: 'ACTIVE',
    armedForSeconds: WRITE_ARM_MAX_AGE,
  });
}
