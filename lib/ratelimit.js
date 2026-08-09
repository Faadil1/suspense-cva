import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const LIMITS = Object.freeze({
  auth: { requests: 10, window: '60 s' },
  distribute: { requests: 3, window: '60 s' },
  release: { requests: 3, window: '60 s' },
});

let _redis = null;
let _initError = null;

function getRedis() {
  if (_redis) return _redis;
  if (_initError) throw _initError;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _initError = Object.assign(new Error('REDIS_NOT_CONFIGURED'), { code: 'REDIS_NOT_CONFIGURED' });
    throw _initError;
  }
  try {
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    _initError = Object.assign(new Error('REDIS_INIT_FAILED'), { code: 'REDIS_INIT_FAILED' });
    throw _initError;
  }
}

const _limiters = {};
function getLimiter(endpoint) {
  if (_limiters[endpoint]) return _limiters[endpoint];
  const config = LIMITS[endpoint];
  if (!config) throw Object.assign(new Error(`UNKNOWN_ENDPOINT: ${endpoint}`), { code: 'UNKNOWN_ENDPOINT' });
  const redis = getRedis();
  _limiters[endpoint] = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(config.requests, config.window), prefix: `rl:suspense:${endpoint}`, analytics: false });
  return _limiters[endpoint];
}

export async function checkRateLimit(identifier, endpoint) {
  let limiter;
  try { limiter = getLimiter(endpoint); } catch (err) {
    const code = err.code ?? 'REDIS_ERROR';
    console.error(`[ratelimit] REDIS_UNAVAILABLE endpoint=${endpoint} code=${code}`);
    return { allowed: false, status: 503 };
  }
  try {
    const result = await limiter.limit(identifier);
    return result.success ? { allowed: true, remaining: result.remaining } : { allowed: false, remaining: 0, status: 429 };
  } catch {
    console.error(`[ratelimit] REQUEST_FAILED endpoint=${endpoint}`);
    return { allowed: false, status: 503 };
  }
}
