export function validateOrigin(req) {
  const origin = req.headers['origin'];
  if (!origin) return { valid: true };
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (!allowedOrigin) {
    console.error('[origin] ALLOWED_ORIGIN_NOT_CONFIGURED');
    return { valid: false, reason: 'ORIGIN_NOT_CONFIGURED' };
  }
  if (origin !== allowedOrigin) {
    console.error('[origin] ORIGIN_MISMATCH');
    return { valid: false, reason: 'ORIGIN_MISMATCH' };
  }
  return { valid: true };
}
