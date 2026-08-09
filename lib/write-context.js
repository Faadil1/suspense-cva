import {
  CHAIN_ID,
  DEMO_COHORT,
  MAX_ALLOCATIONS,
  AllocationState,
  oneToken,
} from './constants.js';
import { keccak256, AbiCoder } from 'ethers';
import { getContracts } from './rpc.js';
import { validateOrigin } from './origin.js';
import { requireSession } from './auth.js';
import { checkRateLimit } from './ratelimit.js';
import { reserveOperationId, updateOperationState, OpState, isValidUuidV4 } from './replay.js';
import { assertPolicyKnown, isPolicyAllowed, isPolicyGuardFailure } from './policy-guard.js';

export const EXPECTED_DISTRIBUTE_SIGNER = '0xE60435c0FBe928f3F8ed367Eafb65D955FCF5c06';
export const HISTORICAL_VAULT_ADDRESS = '0xA94C6cF70570e0D360D668E0113132c57a6C88E0';
export const WRITE_REPLAY_SCOPE = 'write-context';

function normalizedError(res, status, error, detail) {
  return res.status(status).json(detail ? { error, detail } : { error });
}

function getTokenAmount(liveDecimals) {
  return oneToken(liveDecimals);
}

function getAllocationIds(operationId) {
  return DEMO_COHORT.map((member) => keccak256(
    AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'string', 'string'],
      ['SUSPENSE-001', 'DISTRIBUTE', operationId, `HOLDER-${member.holder}`]
    )
  ));
}

function isRuntimeVaultConfigured(address) {
  return typeof address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isHistoricalVault(address) {
  return address?.toLowerCase() === HISTORICAL_VAULT_ADDRESS.toLowerCase();
}

export function getRuntimeVaultAddress() {
  return process.env.SUSPENSE_RUNTIME_VAULT_ADDRESS || null;
}

export function getWriteGateState() {
  return process.env.SUSPENSE_WRITE_GATE || 'CLOSED';
}

async function requireWriteGate(res, dryRun) {
  if (dryRun) {
    return true;
  }
  if (getWriteGateState() !== 'OPEN') {
    normalizedError(res, 409, 'WRITE_GATE_CLOSED');
    return false;
  }
  return true;
}

export async function buildWriteContext(req, res, deps = {}) {
  const {
    validateOriginFn = validateOrigin,
    requireSessionFn = requireSession,
    checkRateLimitFn = checkRateLimit,
    reserveOperationIdFn = reserveOperationId,
    updateOperationStateFn = updateOperationState,
    getContractsFn = getContracts,
  } = deps;

  if (req.method !== 'POST') {
    return { ok: false, status: 405, error: 'Method Not Allowed' };
  }

  const origin = validateOriginFn(req);
  if (!origin.valid) {
    return { ok: false, status: 403, error: 'ORIGIN_REJECTED' };
  }

  const session = requireSessionFn(req, res);
  if (!session.proceed) {
    return { ok: false, status: res.statusCode ?? 401, error: 'UNAUTHORIZED' };
  }

  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const rate = await checkRateLimitFn(ip, 'distribute');
  if (!rate.allowed) {
    return { ok: false, status: rate.status === 503 ? 503 : 429, error: rate.status === 503 ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED' };
  }

  const runtimeVault = getRuntimeVaultAddress();
  if (!isRuntimeVaultConfigured(runtimeVault)) {
    return { ok: false, status: 503, error: 'RUNTIME_VAULT_NOT_CONFIGURED' };
  }
  if (isHistoricalVault(runtimeVault)) {
    return { ok: false, status: 409, error: 'HISTORICAL_VAULT_REJECTED' };
  }

  const operationId = req.body?.operationId;
  if (!isValidUuidV4(operationId)) {
    return { ok: false, status: 400, error: 'INVALID_REQUEST' };
  }

  const dryRun = req.body?.dryRun === true;
  if (!(await requireWriteGate(res, dryRun))) {
    return { ok: false, status: 409, error: 'WRITE_GATE_CLOSED' };
  }

  if (!dryRun) {
    const reserved = await reserveOperationIdFn(WRITE_REPLAY_SCOPE, operationId);
    if (!reserved.reserved) {
      return { ok: false, status: reserved.status ?? 503, error: reserved.status === 409 ? 'DUPLICATE_OPERATION_ID' : 'REPLAY_UNAVAILABLE' };
    }
  }

  const { provider, token, vault, policy } = await getContractsFn();
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    return { ok: false, status: 503, error: 'CHAIN_MISMATCH' };
  }

  return {
    ok: true,
    chainId: CHAIN_ID,
    runtimeVault,
    historicalVault: HISTORICAL_VAULT_ADDRESS,
    token,
    vault,
    policy,
    signer: EXPECTED_DISTRIBUTE_SIGNER,
    dryRun,
    operationId,
    getTokenAmount,
    getAllocationIds,
    reserveOperationIdFn,
    updateOperationStateFn,
    reserveContext: dryRun ? 'DRY_RUN' : 'WRITE',
    isPolicyAllowed,
    assertPolicyKnown,
    isPolicyGuardFailure,
    AllocationState,
    MAX_ALLOCATIONS,
  };
}
