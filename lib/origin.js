export const DEFAULT_ALLOWED_ORIGIN = 'https://suspense-cva-level3.vercel.app';

export function validateOrigin(req) {
  const origin = req.headers['origin'];
  if (!origin) return { valid: true };

  const allowedOrigin = process.env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN;
  if (origin !== allowedOrigin) {
    console.error('[origin] ORIGIN_MISMATCH');
    return { valid: false, reason: 'ORIGIN_MISMATCH' };
  }
  return { valid: true };
}
