import { test } from 'node:test';
import * as assert from 'node:assert';

import {
  KEYWORDS,
  ENV_VARS,
  desiredPhoneNumberSettings,
  planSettingChanges,
  planKeywordChanges,
  missingRequiredEnv,
  isSmsConfigured,
  formatEnvHelp,
} from '#lib/smsTfnConfig.js';

// The sync script (bin/sync-sms-config.js) is diff-first and idempotent; these tests pin
// the pure planning logic that decides what (if anything) to write, so re-running the sync
// against an already-correct number is a guaranteed no-op.

test('desiredPhoneNumberSettings', async (t) => {
  await t.test('defaults: two-way on, AWS-managed opt-outs, and does NOT force an opt-out list', () => {
    // Never defaulting the list is deliberate — see the comment in the module. Forcing
    // "Default" would leak opt-outs across environments in a shared AWS account.
    const s = desiredPhoneNumberSettings({});
    assert.deepStrictEqual(s, { TwoWayEnabled: true, SelfManagedOptOutsEnabled: false });
    assert.ok(!('OptOutListName' in s));
  });

  await t.test('manages the opt-out list + two-way channel only when explicitly set in env', () => {
    const s = desiredPhoneNumberSettings({
      AWS_SMS_OPT_OUT_LIST_NAME: 'CareConnectStaging',
      AWS_SMS_INBOUND_TOPIC_ARN: 'arn:aws:sns:us-west-2:1:careconnect-inbound',
    });
    assert.strictEqual(s.OptOutListName, 'CareConnectStaging');
    assert.strictEqual(s.TwoWayChannelArn, 'arn:aws:sns:us-west-2:1:careconnect-inbound');
  });
});

test('planSettingChanges', async (t) => {
  const desired = { TwoWayEnabled: true, SelfManagedOptOutsEnabled: false, OptOutListName: 'Default' };

  await t.test('returns nothing when already in sync (ignores extra live fields)', () => {
    const current = { TwoWayEnabled: true, SelfManagedOptOutsEnabled: false, OptOutListName: 'Default', PhoneNumber: '+1833...' };
    assert.deepStrictEqual(planSettingChanges(current, desired), {});
  });

  await t.test('returns only the differing fields', () => {
    const current = { TwoWayEnabled: false, SelfManagedOptOutsEnabled: false, OptOutListName: 'Default' };
    assert.deepStrictEqual(planSettingChanges(current, desired), { TwoWayEnabled: true });
  });

  await t.test('treats a missing field as a change', () => {
    assert.deepStrictEqual(planSettingChanges({}, { OptOutListName: 'Default' }), { OptOutListName: 'Default' });
  });
});

test('planKeywordChanges', async (t) => {
  const desired = {
    HELP: { action: 'AUTOMATIC_RESPONSE', message: 'help msg' },
    STOP: { action: 'OPT_OUT', message: 'stop msg' },
  };

  await t.test('returns nothing when all keywords match', () => {
    const current = [
      { Keyword: 'HELP', KeywordAction: 'AUTOMATIC_RESPONSE', KeywordMessage: 'help msg' },
      { Keyword: 'STOP', KeywordAction: 'OPT_OUT', KeywordMessage: 'stop msg' },
    ];
    assert.deepStrictEqual(planKeywordChanges(current, desired), []);
  });

  await t.test('flags a keyword whose message differs (e.g. the "Default Stop Message" placeholder)', () => {
    const current = [
      { Keyword: 'HELP', KeywordAction: 'AUTOMATIC_RESPONSE', KeywordMessage: 'help msg' },
      { Keyword: 'STOP', KeywordAction: 'OPT_OUT', KeywordMessage: 'Default Stop Message' },
    ];
    const changes = planKeywordChanges(current, desired);
    assert.strictEqual(changes.length, 1);
    assert.strictEqual(changes[0].keyword, 'STOP');
    assert.strictEqual(changes[0].message, 'stop msg');
    assert.strictEqual(changes[0].from, 'Default Stop Message');
  });

  await t.test('flags a missing keyword, and an action mismatch', () => {
    const current = [{ Keyword: 'HELP', KeywordAction: 'OPT_OUT', KeywordMessage: 'help msg' }]; // wrong action, STOP absent
    const changes = planKeywordChanges(current, desired);
    assert.deepStrictEqual(changes.map((c) => c.keyword).sort(), ['HELP', 'STOP']);
  });

  await t.test('the shipped KEYWORDS map has HELP + STOP with the expected actions', () => {
    assert.strictEqual(KEYWORDS.HELP.action, 'AUTOMATIC_RESPONSE');
    assert.strictEqual(KEYWORDS.STOP.action, 'OPT_OUT');
  });
});

// The environment contract is what the operator sees in --help and in the preflight
// failure. Both read from ENV_VARS, so these pin that they stay in agreement.
test('environment contract', async (t) => {
  const complete = {
    AWS_SMS_ACCESS_KEY_ID: 'AKIA...',
    AWS_SMS_SECRET_ACCESS_KEY: 'secret',
    AWS_SMS_ORIGINATION_NUMBER: '+18337225979',
  };

  await t.test('a complete environment is missing nothing', () => {
    assert.deepStrictEqual(missingRequiredEnv(complete), []);
  });

  await t.test('names every missing required var, and ignores optional ones', () => {
    assert.deepStrictEqual(missingRequiredEnv({}), [
      'AWS_SMS_ACCESS_KEY_ID',
      'AWS_SMS_SECRET_ACCESS_KEY',
      'AWS_SMS_ORIGINATION_NUMBER',
    ]);
    // Optional vars alone never satisfy the check...
    assert.deepStrictEqual(
      missingRequiredEnv({ AWS_SMS_REGION: 'us-west-2', AWS_SMS_OPT_OUT_LIST_NAME: 'CareConnectDev' }),
      ['AWS_SMS_ACCESS_KEY_ID', 'AWS_SMS_SECRET_ACCESS_KEY', 'AWS_SMS_ORIGINATION_NUMBER']
    );
    // ...and omitting them from a complete environment is still fine.
    assert.deepStrictEqual(missingRequiredEnv({ ...complete }), []);
  });

  await t.test('distinguishes "no SMS here" from "half-configured"', () => {
    // Nothing set: the deploy hook is allowed to skip.
    assert.strictEqual(isSmsConfigured({}), false);
    // Something set but incomplete: a mistake, never skipped.
    assert.strictEqual(isSmsConfigured({ AWS_SMS_ORIGINATION_NUMBER: '+18337225979' }), true);
    assert.ok(missingRequiredEnv({ AWS_SMS_ORIGINATION_NUMBER: '+18337225979' }).length);
  });

  await t.test('help text lists every var and shows which are set', () => {
    const help = formatEnvHelp(complete);
    for (const { name } of ENV_VARS) assert.ok(help.includes(name), `missing ${name}`);
    assert.match(help, /AWS_SMS_ACCESS_KEY_ID {2}\(required, currently set\)/);
    assert.match(help, /AWS_SMS_REGION {2}\(optional, currently NOT SET\)/);
  });
});
