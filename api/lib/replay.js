/**
 * api/lib/replay.js
 *
 * Instance-independent operationId replay protection via Upstash Redis.
 *
 * ── Atomic reservation contract ───────────────────────────────────────────
 * Reservation is a single atomic Redis command:
 *   SET replay:<scope>:<operationId> RESERVED NX EX 600
 *
 * NX means "only set if key does not exist" — atomically safe across
 * concurrent Vercel instances. A GET-then-SET pattern is PROHIBITED because
 * two concurrent requests can both read "not seen" and both proceed.
 *
 * ── Lifecycle ─────────────────────────────────────────────────────────────
 * RESERVED  → Initial state set by reserveOperationId().
 * SUBMITTED → Set when the transaction is broadcast to the chain.
 * CONFIRMED → Set when the receipt is received and parsed.
 * FAILED    → Set on transaction error. NOT deleted — TTL handles expiry.
 *             This prevents a failed operationId from being reused within TTL.
 *
 * On-chain idempotency guards (DuplicateAllocation, NotSuspended reverts)
 * remain as defense-in-depth but are NOT the primary replay control.
 *
 * ── Security ──────────────────────────────────────────────────────────────
 * - Redis credentials never logged or returned.
 * - Raw Redis errors never logged; normalized codes only.
 * - Fail-closed: Redis unavailable → { reserved: false, status: 503 }.
 */

import { Redis } from '@upstash/redis';

const REPLAY_TTL    = 600; // seconds — matches session max-age
const KEY_PREFIX    = 'replay';

// ── Lifecycle states ───────────────────────────────────────────────────────

export const OpState = Object.freeze({
  RESERVED:  'RESERVED',
  SUBMITTED: 'SUBMITTED',
  CONFIRMED: 'CONFIRMED',
  FAILED:    'FAILED',
});

// ── Lazy Redis client ──────────────────────────────────────────────────────

let _redis     = null;
let _initError = null;

function getRedis() {
  if (_redis)     return _redis;
  if (_initError) throw _initError;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    _initError = Object.assign(
      new Error('REDIS_NOT_CONFIGURED'),
      { code: 'REDIS_NOT_CONFIGURED' }
    );
    throw _initError;
  }

  try {
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    _initError = Object.assign(
      new Error('REDIS_INIT_FAILED'),
      { code: 'REDIS_INIT_FAILED' }
    );
    throw _initError;
  }
}

function replayKey(scope, operationId) {
  return `${KEY_PREFIX}:${scope}:${operationId}`;
}

// ── UUID v4 validation ─────────────────────────────────────────────────────

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a string is a well-formed UUID v4.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function isValidUuidV4(id) {
  return typeof id === 'string' && UUID_V4_RE.test(id);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Atomically reserve an operationId.
 *
 * Uses SET NX EX — safe across concurrent Vercel instances.
 * Returns { reserved: true } on first reservation.
 * Returns { reserved: false, status: 409 } if already seen.
 * Returns { reserved: false, status: 503 } if Redis is unavailable.
 *
 * @param {string} scope       — endpoint scope e.g. 'distribute'
 * @param {string} operationId — UUID v4 supplied by client
 * @returns {Promise<{ reserved: boolean, status?: number }>}
 */
export async function reserveOperationId(scope, operationId) {
  let redis;
  try {
    redis = getRedis();
  } catch (err) {
    const code = err.code ?? 'REDIS_ERROR';
    console.error(`[replay] REDIS_UNAVAILABLE scope=${scope} code=${code}`);
    return { reserved: false, status: 503 };
  }

  try {
    // Atomic: SET NX EX — returns 'OK' on first write, null if already exists.
    const result = await redis.set(
      replayKey(scope, operationId),
      OpState.RESERVED,
      { nx: true, ex: REPLAY_TTL }
    );

    if (result === 'OK') {
      return { reserved: true };
    }

    // Duplicate operationId.
    console.error(`[replay] DUPLICATE_OPERATION_ID scope=${scope}`);
    return { reserved: false, status: 409 };

  } catch {
    // Redis request failed — fail-closed.
    console.error(`[replay] REQUEST_FAILED scope=${scope}`);
    return { reserved: false, status: 503 };
  }
}

/**
 * Update the lifecycle state of a reserved operationId.
 *
 * Call after reserveOperationId() succeeds:
 *   Before broadcast: updateOperationState(scope, id, OpState.SUBMITTED)
 *   On confirmed:     updateOperationState(scope, id, OpState.CONFIRMED)
 *   On error:         updateOperationState(scope, id, OpState.FAILED)
 *
 * FAILED is intentionally NOT deleted — TTL handles expiry to prevent reuse.
 * State update failures are non-fatal: the reservation is still valid.
 *
 * ── XX + KEEPTTL semantics ────────────────────────────────────────────────
 * SET ... XX KEEPTTL:
 *   XX      — only update if the key already exists. If the original reservation
 *             has expired (or was never created), the update MUST NOT recreate
 *             the replay key. A recreated key would bypass the 409 guard for a
 *             future request with the same operationId.
 *   KEEPTTL — preserve the original TTL; do not reset expiry on state update.
 *             The replay window is anchored to the initial reservation, not to
 *             the last state transition.
 *
 * When result === null: key was expired or missing → STATE_UPDATE_MISSING logged.
 * No key is created. Caller is not thrown; reservation lifecycle is best-effort.
 *
 * @param {string} scope
 * @param {string} operationId
 * @param {string} state — OpState value
 * @returns {Promise<void>}
 */
export async function updateOperationState(scope, operationId, state) {
  let redis;
  try {
    redis = getRedis();
  } catch {
    // State update is best-effort; reservation was already atomic.
    console.error(`[replay] STATE_UPDATE_REDIS_UNAVAILABLE scope=${scope} state=${state}`);
    return;
  }

  try {
    // XX     — only update if key exists; expired/missing key must NOT be recreated.
    // KEEPTTL — preserve original TTL; do not reset expiry on state update.
    const result = await redis.set(
      replayKey(scope, operationId),
      state,
      { xx: true, keepTtl: true }
    );

    if (result === null) {
      // Key expired before state update or was never reserved.
      // Do not recreate — log normalized code only.
      console.error(`[replay] STATE_UPDATE_MISSING scope=${scope} state=${state}`);
    }
  } catch {
    // Non-fatal: reservation remains valid.
    console.error(`[replay] STATE_UPDATE_FAILED scope=${scope} state=${state}`);
  }
}
