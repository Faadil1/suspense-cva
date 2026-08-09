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
import {
  requireSession,
  extractWriteArmCookie,
  verifyWriteArmToken,
  validateSecretConfig,
} from './auth.js';
import { checkRateLimit } from './ratelimit.js';
import { reserveOperationId, updateOperationState, OpState, isValidUuidV4 } from './replay.js';
import { assertPolicyKnown, isPolicyAllowed, isPolicyGuardFailure } from './policy-guard.js';

export const EXPECTED_DISTRIBUTE_SIGNER = '0xc8D2A86a4C7Abb08B7328E2cB67d3A8C18E02049';
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

export function evaluateWriteArm(req) {
  const gate = getWriteGateState();
  if (gate === 'LOCKED') return { allowed: false, mode: 'LOCKED', reason: 'WRITE_GATE_LOCKED' };
  if (gate === 'OPEN') return { allowed: true, mode: 'ENV_OPEN' };

  const operatorSecret = process.env.OPERATOR_AUTH_SECRET;
  const secretCheck = validateSecretConfig(operatorSecret, '[write-arm]');
  if (!secretCheck.valid) return { allowed: false, mode: 'CLOSED', reason: secretCheck.error };

  const armToken = extractWriteArmCookie(req);
  if (!armToken) return { allowed: false, mode: 'CLOSED', reason: 'WRITE_ARM_REQUIRED' };

  const arm = verifyWriteArmToken(armToken, operatorSecret);
  if (!arm.valid) return { allowed: false, mode: 'CLOSED', reason: 'WRITE_ARM_INVALID' };
  return { allowed: true, mode: 'SESSION_ARM', exp: arm.exp };
}

async function requireWriteGate(req, res, dryRun) {
  if (dryRun) return { ok: true, mode: 'DRY_RUN' };
  const arm = evaluateWriteArm(req);
  if (!arm.allowed) {
    normalizedError(res, 409, arm.reason || 'WRITE_GATE_CLOSED');
    return { ok: false, mode: arm.mode };
  }
  return { ok: true, mode: arm.mode, exp: arm.exp };
}

export async function buildWriteContext(req, res, deps = {}) {
  const {
    validateOriginFn = validateOrigin,
    requireSessionFn = requireSession,
    checkRateLimitFn = checkRateLimit,
    reserveOperationIdFn = reserveOperationId,
    updateOperationStateFn = updateOperationState,
    getContractsFn = getContracts,
    scope = WRITE_REPLAY_SCOPE,
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
  const rate = await checkRateLimitFn(ip, scope);
  if (!rate.allowed) {
    return {
      ok: false,
      status: rate.status === 503 ? 503 : 429,
      error: rate.status === 503 ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED',
    };
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
  const gate = await requireWriteGate(req, res, dryRun);
  if (!gate.ok) {
    return { ok: false, status: 409, error: 'WRITE_GATE_CLOSED' };
  }

  if (!dryRun) {
    const reserved = await reserveOperationIdFn(scope, operationId);
    if (!reserved.reserved) {
      return {
        ok: false,
        status: reserved.status ?? 503,
        error: reserved.status === 409 ? 'DUPLICATE_OPERATION_ID' : 'REPLAY_UNAVAILABLE',
      };
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
    operationScope: scope,
    writeGateMode: gate.mode,
    writeArmExpiresAt: gate.exp ?? null,
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
