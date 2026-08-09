import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  createWriteArmToken,
  verifyWriteArmToken,
  WRITE_ARM_MAX_AGE,
} from '../lib/auth.js';
import {
  evaluateWriteArm,
  EXPECTED_DISTRIBUTE_SIGNER,
} from '../lib/write-context.js';
import { ERC20_ABI } from '../lib/constants.js';

const SECRET = 'operator-test-secret-with-at-least-32-bytes!';

function withEnv(values, fn) {
  const before = {};
  for (const [key, value] of Object.entries(values)) {
    before[key] = process.env[key];
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('operator write arming', () => {
  test('write arm lifetime is intentionally short', () => {
    assert.equal(WRITE_ARM_MAX_AGE, 90);
  });

  test('write arm token verifies only with the correct secret', () => {
    const token = createWriteArmToken(SECRET);
    assert.equal(verifyWriteArmToken(token, SECRET).valid, true);
    assert.equal(verifyWriteArmToken(token, 'wrong-secret-with-at-least-32-bytes!!').valid, false);
  });

  test('CLOSED requires an authenticated write_arm cookie', () => {
    withEnv({ OPERATOR_AUTH_SECRET: SECRET, SUSPENSE_WRITE_GATE: 'CLOSED' }, () => {
      const denied = evaluateWriteArm({ headers: {} });
      assert.equal(denied.allowed, false);
      assert.equal(denied.reason, 'WRITE_ARM_REQUIRED');

      const token = createWriteArmToken(SECRET);
      const allowed = evaluateWriteArm({ headers: { cookie: `write_arm=${token}` } });
      assert.equal(allowed.allowed, true);
      assert.equal(allowed.mode, 'SESSION_ARM');
    });
  });

  test('LOCKED is a hard kill switch even when a write arm cookie exists', () => {
    withEnv({ OPERATOR_AUTH_SECRET: SECRET, SUSPENSE_WRITE_GATE: 'LOCKED' }, () => {
      const token = createWriteArmToken(SECRET);
      const result = evaluateWriteArm({ headers: { cookie: `write_arm=${token}` } });
      assert.equal(result.allowed, false);
      assert.equal(result.reason, 'WRITE_GATE_LOCKED');
    });
  });

  test('OPEN remains an explicit environment override', () => {
    withEnv({ OPERATOR_AUTH_SECRET: null, SUSPENSE_WRITE_GATE: 'OPEN' }, () => {
      const result = evaluateWriteArm({ headers: {} });
      assert.equal(result.allowed, true);
      assert.equal(result.mode, 'ENV_OPEN');
    });
  });
});

describe('SPNS03 write path invariants', () => {
  test('expected runtime signer is the final SPNS03 signer', () => {
    assert.equal(
      EXPECTED_DISTRIBUTE_SIGNER,
      '0xc8D2A86a4C7Abb08B7328E2cB67d3A8C18E02049'
    );
  });

  test('ERC20 ABI contains the verified mint(address,uint256) path', () => {
    assert.ok(ERC20_ABI.includes('function mint(address to,uint256 amount)'));
  });
});
