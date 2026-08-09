import { Redis } from '@upstash/redis';

const REPLAY_TTL = 600;
const KEY_PREFIX = 'replay';
export const OpState = Object.freeze({ RESERVED: 'RESERVED', SUBMITTED: 'SUBMITTED', CONFIRMED: 'CONFIRMED', FAILED: 'FAILED' });

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
  try { _redis = new Redis({ url, token }); return _redis; } catch {
    _initError = Object.assign(new Error('REDIS_INIT_FAILED'), { code: 'REDIS_INIT_FAILED' });
    throw _initError;
  }
}

function replayKey(scope, operationId) { return `${KEY_PREFIX}:${scope}:${operationId}`; }
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isValidUuidV4(id) { return typeof id === 'string' && UUID_V4_RE.test(id); }

export async function reserveOperationId(scope, operationId) {
  let redis;
  try { redis = getRedis(); } catch (err) {
    const code = err.code ?? 'REDIS_ERROR';
    console.error(`[replay] REDIS_UNAVAILABLE scope=${scope} code=${code}`);
    return { reserved: false, status: 503 };
  }
  try {
    const result = await redis.set(replayKey(scope, operationId), OpState.RESERVED, { nx: true, ex: REPLAY_TTL });
    if (result === 'OK') return { reserved: true };
    console.error(`[replay] DUPLICATE_OPERATION_ID scope=${scope}`);
    return { reserved: false, status: 409 };
  } catch {
    console.error(`[replay] REQUEST_FAILED scope=${scope}`);
    return { reserved: false, status: 503 };
  }
}

export async function updateOperationState(scope, operationId, state) {
  let redis;
  try { redis = getRedis(); } catch {
    console.error(`[replay] STATE_UPDATE_REDIS_UNAVAILABLE scope=${scope} state=${state}`);
    return;
  }
  try {
    const result = await redis.set(replayKey(scope, operationId), state, { xx: true, keepTtl: true });
    if (result === null) console.error(`[replay] STATE_UPDATE_MISSING scope=${scope} state=${state}`);
  } catch {
    console.error(`[replay] STATE_UPDATE_FAILED scope=${scope} state=${state}`);
  }
}
