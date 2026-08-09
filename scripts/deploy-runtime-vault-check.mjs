import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createDeployRuntimeVaultHandler,
  DEPLOY_ARM_KEY,
  EXPECTED_DEPLOY_SIGNER,
} from '../api/deploy-runtime-vault.js';
import { SUSPENSE_VAULT_ARTIFACT } from '../lib/suspense-vault-artifact.js';

function createResponse() {
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

const source = readFileSync(new URL('../api/deploy-runtime-vault.js', import.meta.url), 'utf8');

const requiredStrings = [
  'if (process.env[DEPLOY_ARM_KEY] !== \'OPEN\')',
  'isValidUuidV4(operationId)',
  'reserveOperationIdFn(DEPLOY_REPLAY_SCOPE, operationId)',
  'new WalletCtor(signerSecret, provider)',
  'new ContractFactoryCtor(',
  'EXPECTED_DEPLOY_SIGNER',
  'CHAIN_ID',
  'TOKEN_ADDRESS',
  'POLICY_ADDRESS',
  'VAULT_ADDRESS',
  'OpState.SUBMITTED',
  'OpState.CONFIRMED',
  'OpState.FAILED',
  'artifact.bytecodeFingerprint',
  'normalizedError(res, 409, \'DEPLOYMENT_NOT_ARMED\')',
  'normalizedError(res, 503, \'SIGNER_NOT_CONFIGURED\')',
];

for (const needle of requiredStrings) {
  assert.ok(source.includes(needle), `missing source contract: ${needle}`);
}

assert.ok(!source.includes('distribute('), 'no distribute() call site');
assert.ok(!source.includes('release('), 'no release() call site');
assert.ok(!source.includes('SUSPENSE_RUNTIME_VAULT_ADDRESS'), 'no runtime vault env configuration');
assert.ok(!source.includes('SUSPENSE_WRITE_GATE'), 'no write gate opening');
assert.ok(!source.includes('console.error(signerSecret'), 'no secret logging');

let calls = [];
const handler = createDeployRuntimeVaultHandler({
  validateOriginFn: () => ({ valid: true }),
  requireSessionFn: () => ({ proceed: true }),
  checkRateLimitFn: async () => {
    calls.push('rate');
    return { allowed: true };
  },
  reserveOperationIdFn: async () => {
    throw new Error('reserve should not execute while arm closed');
  },
  updateOperationStateFn: async () => {
    throw new Error('update should not execute while arm closed');
  },
  getProviderFn: async () => {
    throw new Error('provider should not execute while arm closed');
  },
  WalletCtor: class Wallet {
    constructor() {
      calls.push('wallet');
    }
  },
  ContractFactoryCtor: class ContractFactory {
    constructor() {
      calls.push('factory');
    }
  },
});

const savedArm = process.env[DEPLOY_ARM_KEY];
delete process.env[DEPLOY_ARM_KEY];
process.env.SUSPENSE_DEMO_SIGNER_PRIVATE_KEY = 'x'.repeat(32);

const res = createResponse();
await handler({
  method: 'POST',
  headers: {},
  body: { operationId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
}, res);

if (savedArm !== undefined) {
  process.env[DEPLOY_ARM_KEY] = savedArm;
}
delete process.env.SUSPENSE_DEMO_SIGNER_PRIVATE_KEY;

assert.equal(res.statusCode, 409);
assert.deepEqual(res.body, { error: 'DEPLOYMENT_NOT_ARMED' });
assert.deepEqual(calls, ['rate']);

assert.equal(SUSPENSE_VAULT_ARTIFACT.contractName, 'SuspenseVault');
assert.equal(SUSPENSE_VAULT_ARTIFACT.abi.length > 0, true);
assert.equal(SUSPENSE_VAULT_ARTIFACT.bytecode.startsWith('0x'), true);
assert.equal(SUSPENSE_VAULT_ARTIFACT.bytecodeFingerprint.length, 64);
assert.equal(EXPECTED_DEPLOY_SIGNER, '0xE60435c0FBe928f3F8ed367Eafb65D955FCF5c06');

console.log('PASS 34/34');
