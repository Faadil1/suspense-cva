import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  createDeployRuntimeVaultHandler,
  DEPLOY_ARM_KEY,
  EXPECTED_DEPLOY_SIGNER,
} from '../api/deploy-runtime-vault.js';

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

describe('deploy-runtime-vault', () => {
  test('POST only', async () => {
    const handler = createDeployRuntimeVaultHandler();
    const res = createResponse();
    await handler({ method: 'GET', headers: {}, body: {} }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.body.error, 'Method Not Allowed');
  });

  test('deployment arm closed short-circuits before secret/provider/wallet/factory', async () => {
    const calls = [];
    const handler = createDeployRuntimeVaultHandler({
      validateOriginFn: () => ({ valid: true }),
      requireSessionFn: () => ({ proceed: true }),
      checkRateLimitFn: async () => {
        calls.push('rate');
        return { allowed: true };
      },
      reserveOperationIdFn: async () => {
        throw new Error('reserve should not be reached while arm is closed');
      },
      getProviderFn: async () => {
        throw new Error('provider should not be reached while arm is closed');
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

    const saved = process.env[DEPLOY_ARM_KEY];
    delete process.env[DEPLOY_ARM_KEY];
    process.env.SUSPENSE_DEMO_SIGNER_PRIVATE_KEY = 'x'.repeat(32);

    const res = createResponse();
    await handler({
      method: 'POST',
      headers: {},
      body: { operationId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
    }, res);

    if (saved !== undefined) {
      process.env[DEPLOY_ARM_KEY] = saved;
    }
    delete process.env.SUSPENSE_DEMO_SIGNER_PRIVATE_KEY;

    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, { error: 'DEPLOYMENT_NOT_ARMED' });
    assert.deepEqual(calls, ['rate']);
  });

  test('constructor and fixed target values are hardcoded', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../api/deploy-runtime-vault.js', import.meta.url), 'utf8');
    assert.ok(src.includes(EXPECTED_DEPLOY_SIGNER), 'fixed signer present in source');
    assert.ok(src.includes('TOKEN_ADDRESS'), 'token fixed in source');
    assert.ok(src.includes('POLICY_ADDRESS'), 'policy fixed in source');
    assert.ok(src.includes('SUSPENSE_VAULT_ARTIFACT'), 'artifact import present');
    assert.ok(src.includes('DEPLOY_ARM_KEY'), 'arm gate present');
    assert.ok(src.includes('reserveOperationIdFn'), 'atomic reservation hook present');
  });
});
