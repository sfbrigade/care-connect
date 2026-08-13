#!/usr/bin/env node

import '../config.js';
import process from 'node:process';
import {
  PinpointSMSVoiceV2Client,
  DescribePhoneNumbersCommand,
  DescribeKeywordsCommand,
  DescribeOptOutListsCommand,
  PutKeywordCommand,
  UpdatePhoneNumberCommand,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';

import { KEYWORDS, desiredPhoneNumberSettings, planSettingChanges, planKeywordChanges } from '#lib/smsTfnConfig.js';

const log = (message) => console.log(`[sms-config] ${message}`);
const logError = (message) => console.error(`[sms-config] ${message}`);

// Bring our toll-free number's AWS config (keyword auto-responses + phone-number settings)
// in line with the desired state declared in lib/smsTfnConfig.js. Idempotent and diff-first:
// only writes what actually differs, so it's safe to run on every deploy. Targets the number
// in AWS_SMS_ORIGINATION_NUMBER (per-environment). Pass --dry-run to preview without writing.
//
//   node bin/sync-sms-config.js            # apply
//   node bin/sync-sms-config.js --dry-run  # preview only

const dryRun = process.argv.includes('--dry-run');
const tfn = process.env.AWS_SMS_ORIGINATION_NUMBER;

// Skip if SMS not configured in environment
if (!tfn) {
  log('AWS_SMS_ORIGINATION_NUMBER not set — nothing to sync.');
  process.exit(0);
}
if (!process.env.AWS_SMS_ACCESS_KEY_ID || !process.env.AWS_SMS_SECRET_ACCESS_KEY) {
  log('AWS SMS credentials not set — skipping.');
  process.exit(0);
}

const client = new PinpointSMSVoiceV2Client({
  credentials: {
    accessKeyId: process.env.AWS_SMS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SMS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_SMS_REGION ?? 'us-west-2',
});

async function describeAllKeywords (OriginationIdentity) {
  const keywords = [];
  let NextToken;
  do {
    const resp = await client.send(new DescribeKeywordsCommand({ OriginationIdentity, NextToken }));
    keywords.push(...(resp.Keywords ?? []));
    NextToken = resp.NextToken;
  } while (NextToken);
  return keywords;
}

try {
  // Resolve the number to its PhoneNumberId
  const phones = await client.send(new DescribePhoneNumbersCommand({}));
  const number = (phones.PhoneNumbers ?? []).find((p) => p.PhoneNumber === tfn);
  if (!number) {
    logError(`Toll-free number ${tfn} not found in this AWS account/region.`);
    process.exit(1);
  }
  const OriginationIdentity = number.PhoneNumberId;
  log(`${dryRun ? 'DRY RUN — ' : ''}syncing ${tfn} (${OriginationIdentity})`);

  let changes = 0;

  // Phone-number settings (two-way, opt-out management, opt-out list, two-way channel).
  const settingChanges = planSettingChanges(number, desiredPhoneNumberSettings());

  // Guard: never associate the number with an opt-out list that doesn't exist (a typo, or
  // a per-env list that hasn't been created yet). Fail loudly with the fix instead.
  if (settingChanges.OptOutListName) {
    const lists = await client.send(new DescribeOptOutListsCommand({}));
    const exists = (lists.OptOutLists ?? []).some((l) => l.OptOutListName === settingChanges.OptOutListName);
    if (!exists) {
      logError(`Opt-out list "${settingChanges.OptOutListName}" does not exist in this account/region.`);
      logError(`Create it once for this environment, then re-run:  aws pinpoint-sms-voice-v2 create-opt-out-list --opt-out-list-name ${settingChanges.OptOutListName}`);
      process.exit(1);
    }
  }

  if (Object.keys(settingChanges).length) {
    for (const [key, value] of Object.entries(settingChanges)) {
      log(`setting ${key}: ${JSON.stringify(number[key])} -> ${JSON.stringify(value)}`);
    }
    if (!dryRun) await client.send(new UpdatePhoneNumberCommand({ PhoneNumberId: OriginationIdentity, ...settingChanges }));
    changes += Object.keys(settingChanges).length;
  } else {
    log('phone-number settings already in sync.');
  }

  // Keyword auto-responses
  const keywordChanges = planKeywordChanges(await describeAllKeywords(OriginationIdentity), KEYWORDS);
  for (const change of keywordChanges) {
    log(`keyword ${change.keyword} [${change.action}]: ${JSON.stringify(change.from)} -> ${JSON.stringify(change.message)}`);
    if (!dryRun) {
      await client.send(new PutKeywordCommand({
        OriginationIdentity,
        Keyword: change.keyword,
        KeywordMessage: change.message,
        KeywordAction: change.action,
      }));
    }
    changes += 1;
  }
  if (!keywordChanges.length) log('keywords already in sync.');

  log(dryRun
    ? `DRY RUN complete — ${changes} change(s) would be applied.`
    : `done — ${changes} change(s) applied.`);
  process.exit(0);
} catch (err) {
  logError(`failed: ${err.message}`);
  process.exit(1);
}
