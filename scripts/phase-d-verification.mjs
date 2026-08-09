import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWriteContext } from '../lib/write-context.js';
import { handler as distributeHandler } from '../api/distribute.js';
import { handler as releaseHandler } from '../api/release.js';

let checks = 0;
function check(fn, message) {
  checks += 1;
  fn(message);
}

function eq(actual, expected, message) {
  check((msg) => assert.equal(actual, expected, msg), message);
}

function ok(value, message) {
  check((msg) => assert.ok(value, msg), message);
}

function deep(actual, expected, message) {
  check((msg) => assert.deepEqual(actual, expected, msg), message);
}

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const srcWriteContext = readFileSync(new URL('../lib/write-context.js', import.meta.url), 'utf8');
const srcDistribute = readFileSync(new URL('../api/distribute.js', import.meta.url), 'utf8');
const srcRelease = readFileSync(new URL('../api/release.js', import.meta.url), 'utf8');

ok(srcWriteContext.includes('HISTORICAL_VAULT_ADDRESS'), 'historical vault constant present');
ok(srcWriteContext.includes('getWriteGateState'), 'write gate accessor present');
ok(srcWriteContext.includes('getAllocationIds(operationId)'), 'allocation ids accept operationId');
ok(srcDistribute.includes('DEMO_COHORT'), 'distribute enumerates canonical cohort');
ok(srcRelease.includes('allocation.state'), 'release checks suspended state');

process.env.SUSPENSE_WRITE_GATE = 'CLOSED';
process.env.SUSPENSE_RUNTIME_VAULT_ADDRESS = '0x1111111111111111111111111111111111111111';

let closedReservation = 0;
const closedBlocked = await buildWriteContext({
  method: 'POST',
  headers: {},
  body: { operationId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
}, response(), {
  validateOriginFn: () => ({ valid: true }),
  requireSessionFn: () => ({ proceed: true }),
  checkRateLimitFn: async () => ({ allowed: true }),
  reserveOperationIdFn: async () => {
    closedReservation += 1;
    throw new Error('reservation must not occur while gate is closed');
  },
  getContractsFn: async () => ({ provider: { getNetwork: async () => ({ chainId: 10143 }) }, token: {}, vault: {}, policy: {} }),
});
eq(closedBlocked.ok, false, 'closed gate blocks');
eq(closedBlocked.error, 'WRITE_GATE_CLOSED', 'closed gate error code');
eq(closedReservation, 0, 'no reservation when gate closed');

process.env.SUSPENSE_WRITE_GATE = 'OPEN';
process.env.SUSPENSE_RUNTIME_VAULT_ADDRESS = '0xA94C6cF70570e0D360D668E0113132c57a6C88E0';
const histBlocked = await buildWriteContext({
  method: 'POST',
  headers: {},
  body: { operationId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
}, response(), {
  validateOriginFn: () => ({ valid: true }),
  requireSessionFn: () => ({ proceed: true }),
  checkRateLimitFn: async () => ({ allowed: true }),
  reserveOperationIdFn: async () => {
    throw new Error('reservation must not occur while runtime vault is historical vault');
  },
  getContractsFn: async () => ({ provider: { getNetwork: async () => ({ chainId: 10143 }) }, token: {}, vault: {}, policy: {} }),
});
eq(histBlocked.ok, false, 'historical vault blocked');
eq(histBlocked.error, 'HISTORICAL_VAULT_REJECTED', 'historical vault error code');

process.env.SUSPENSE_RUNTIME_VAULT_ADDRESS = '0x1111111111111111111111111111111111111111';
const seen = [];
const ctx = await buildWriteContext({
  method: 'POST',
  headers: {},
  body: { operationId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
}, response(), {
  validateOriginFn: () => ({ valid: true }),
  requireSessionFn: () => ({ proceed: true }),
  checkRateLimitFn: async () => ({ allowed: true }),
  reserveOperationIdFn: async () => { seen.push('reserve'); return { reserved: true }; },
  getContractsFn: async () => ({ provider: { getNetwork: async () => ({ chainId: 10143 }) }, token: {}, vault: {}, policy: {} }),
});
eq(ctx.ok, true, 'context ready');
eq(ctx.chainId, 10143, 'chain id 10143');
deep(seen, ['reserve'], 'reservation reached only on open gate');

const allocationIdsA = ctx.getAllocationIds('op-a');
const allocationIdsA2 = ctx.getAllocationIds('op-a');
const allocationIdsB = ctx.getAllocationIds('op-b');
eq(Array.isArray(allocationIdsA), true, 'allocation IDs array');
eq(allocationIdsA.length, 5, 'five allocation IDs');
ok(allocationIdsA.every((id) => typeof id === 'string' && id.startsWith('0x') && id.length === 66), 'bytes32 IDs');
deep(allocationIdsA, allocationIdsA2, 'same operationId deterministic');
ok(allocationIdsA.some((id, i) => id !== allocationIdsB[i]), 'different operationId changes IDs');

const dryRunDistribute = await distributeHandler({
  method: 'POST',
  headers: {},
  body: { operationId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', dryRun: true },
}, response(), {
  validateOriginFn: () => ({ valid: true }),
  requireSessionFn: () => ({ proceed: true }),
  checkRateLimitFn: async () => ({ allowed: true }),
  reserveOperationIdFn: async () => { throw new Error('dry run must not reserve'); },
  getContractsFn: async () => ({
    provider: { getNetwork: async () => ({ chainId: 10143 }) },
    token: {},
    vault: {},
    policy: { canTransfer: async () => true },
  }),
});
eq(dryRunDistribute.statusCode, 200, 'dry run distribute OK');
eq(dryRunDistribute.body.noReservation, true, 'dry run no reservation');
eq(dryRunDistribute.body.noSigning, true, 'dry run no signing');
eq(dryRunDistribute.body.noBroadcast, true, 'dry run no broadcast');

let releaseReplayCalls = [];
const dryRunRelease = await releaseHandler({
  method: 'POST',
  headers: {},
  body: { operationId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', allocationId: '0x' + '1'.repeat(64), dryRun: true },
}, response(), {
  validateOriginFn: () => ({ valid: true }),
  requireSessionFn: () => ({ proceed: true }),
  checkRateLimitFn: async () => ({ allowed: true }),
  reserveOperationIdFn: async () => { throw new Error('dry run must not reserve'); },
  updateOperationStateFn: async (...args) => { releaseReplayCalls.push(args); },
  getContractsFn: async () => ({
    provider: { getNetwork: async () => ({ chainId: 10143 }) },
    token: {},
    vault: { runner: { provider: { getNetwork: async () => ({ chainId: 10143 }) } } },
    policy: { canTransfer: async () => true },
  }),
});
eq(dryRunRelease.statusCode, 200, 'dry run release OK');
eq(dryRunRelease.body.noReservation, true, 'dry run release no reservation');
eq(dryRunRelease.body.noSigning, true, 'dry run release no signing');
eq(dryRunRelease.body.noBroadcast, true, 'dry run release no broadcast');
eq(releaseReplayCalls.length, 0, 'dry run release no replay updates');

console.log(`PHASE_D_VERIFICATION_PASS ${checks}/${checks}`);
