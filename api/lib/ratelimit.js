/**
 * api/lib/ratelimit.js
 *
 * Instance-independent rate limiting via Upstash Redis + @upstash/ratelimit.
 *
 * Fail-closed for writes: if Upstash is unavailable or not configured,
 * checkRateLimit() returns { allowed: false, status: 503 }.
 *
 * ── Instance independence ──────────────────────────────────────────────────
 * Upstash Redis is REST-accessible from all Vercel Function instances.
 * Each cold start initializes one Redis client and one Ratelimit per endpoint,
 * cached for the lifetime of that instance. All instances share the same Redis
 * keyspace, so limits are enforced globally across instances.
 *
 * ── Environment variables (server-side only; never returned to client) ─────
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * ── Security ──────────────────────────────────────────────────────────────
 * - Redis credentials never logged or returned to client.
 * - Raw Redis errors never logged; normalized codes only.
 * - Do NOT fall back to in-memory limiting on Redis failure.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis }     from '@upstash/redis';

// ── Limit table ────────────────────────────────────────────────────────────

const LIMITS = Object.freeze({
  auth:       { requests: 10, window: '60 s' },
  distribute: { requests:  3, window: '60 s' },
  release:    { requests:  3, window: '60 s' },
});

// ── Lazy Redis client (cached per cold start) ──────────────────────────────

let _redis     = null;
let _initError = null;

function getRedis() {
  if (_redis)     return _redis;
  if (_initError) throw _initError;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
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

// ── Limiter cache (one per endpoint per cold start) ────────────────────────

const _limiters = {};

function getLimiter(endpoint) {
  if (_limiters[endpoint]) return _limiters[endpoint];

  const config = LIMITS[endpoint];
  if (!config) {
    throw Object.assign(
      new Error(`UNKNOWN_ENDPOINT: ${endpoint}`),
      { code: 'UNKNOWN_ENDPOINT' }
    );
  }

  const redis = getRedis(); // throws if not configured

  _limiters[endpoint] = new Ratelimit({
    redis,
    limiter:   Ratelimit.slidingWindow(config.requests, config.window),
    prefix:    `rl:suspense:${endpoint}`,
    analytics: false,
  });

  return _limiters[endpoint];
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Check rate limit for a given endpoint and identifier.
 *
 * Fail-closed: Redis unavailable or not configured → { allowed: false, status: 503 }
 *
 * @param {string} identifier — IP address or operator scope
 * @param {string} endpoint   — 'auth' | 'distribute' | 'release'
 * @returns {Promise<{ allowed: boolean, remaining?: number, status?: number }>}
 */
export async function checkRateLimit(identifier, endpoint) {
  let limiter;
  try {
    limiter = getLimiter(endpoint);
  } catch (err) {
    const code = err.code ?? 'REDIS_ERROR';
    console.error(`[ratelimit] REDIS_UNAVAILABLE endpoint=${endpoint} code=${code}`);
    return { allowed: false, status: 503 };
  }

  try {
    const result = await limiter.limit(identifier);
    if (result.success) {
      return { allowed: true, remaining: result.remaining };
    } else {
      return { allowed: false, remaining: 0, status: 429 };
    }
  } catch {
    // Upstash request failed at runtime — fail-closed.
    console.error(`[ratelimit] REQUEST_FAILED endpoint=${endpoint}`);
    return { allowed: false, status: 503 };
  }
}
