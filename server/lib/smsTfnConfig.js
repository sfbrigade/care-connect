import process from 'node:process';

// This file defines AWS End User Messaging config settings for our toll-free number(s).
// The settings are applied via bin/sync-sms-config.js.

// Keyword auto-responses. HELP is answered automatically; STOP performs the (carrier-
// mandated) opt-out and returns this confirmation. Identical across environments.
export const KEYWORDS = {
  HELP: {
    action: 'AUTOMATIC_RESPONSE',
    message: 'CareConnect: Reply PAUSE to pause notifications, RESUME to resume. For assistance, email careconnect@sfgov.org.',
  },
  STOP: {
    action: 'OPT_OUT',
    message: 'CareConnect: You are unsubscribed and will no longer receive messages. Reply START to resubscribe.',
  },
};

// Phone-number-level settings, as an AWS UpdatePhoneNumber-shaped object.
// - Enable two-way messaging
// - Use AWS-managed opt-out lists
// - Environment-specific pieces:
//   - OptOutListName: an Opt-Out list name, provisioned separately per environment.
//   - TwoWayChannelArn: the two-way SNS topic, provisioned as infra per environment.
export function desiredPhoneNumberSettings (env = process.env) {
  const settings = {
    TwoWayEnabled: true,
    SelfManagedOptOutsEnabled: false,
  };
  if (env.AWS_SMS_OPT_OUT_LIST_NAME) settings.OptOutListName = env.AWS_SMS_OPT_OUT_LIST_NAME;
  if (env.AWS_SMS_INBOUND_TOPIC_ARN) settings.TwoWayChannelArn = env.AWS_SMS_INBOUND_TOPIC_ARN;
  return settings;
}

// Diff the live phone-number config (a DescribePhoneNumbers entry) against `desired`,
// returning only the fields that differ (the UpdatePhoneNumber payload). Empty = in sync.
export function planSettingChanges (current, desired) {
  const changes = {};
  for (const [key, value] of Object.entries(desired)) {
    if (current?.[key] !== value) changes[key] = value;
  }
  return changes;
}

// Diff the live keywords (a DescribeKeywords list) against the desired KEYWORDS map,
// returning the keywords that need a PutKeyword (with `from` for logging). Empty = in sync.
export function planKeywordChanges (currentKeywords, desired = KEYWORDS) {
  const current = Object.fromEntries((currentKeywords ?? []).map((k) => [k.Keyword, k]));
  const changes = [];
  for (const [keyword, want] of Object.entries(desired)) {
    const have = current[keyword];
    if (!have || have.KeywordMessage !== want.message || have.KeywordAction !== want.action) {
      changes.push({ keyword, message: want.message, action: want.action, from: have?.KeywordMessage ?? null });
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Environment contract
//
// Single source of truth for what the operator must set before running
// bin/sync-sms-config.js. Drives both `--help` and the preflight check, so the
// documentation and the validation can't drift apart.
export const ENV_VARS = [
  {
    name: 'AWS_SMS_ACCESS_KEY_ID',
    required: true,
    summary: 'IAM access key for AWS End User Messaging SMS.',
    detail: 'Needs sms-voice:DescribePhoneNumbers, DescribeKeywords, DescribeOptOutLists, PutKeyword and UpdatePhoneNumber — more than the app itself needs to send texts.',
  },
  {
    name: 'AWS_SMS_SECRET_ACCESS_KEY',
    required: true,
    summary: 'Secret for the access key above.',
  },
  {
    name: 'AWS_SMS_ORIGINATION_NUMBER',
    required: true,
    summary: 'The toll-free number to configure, in E.164 (e.g. +18337225979).',
    detail: 'Must be E.164, not a phone-number ARN — the number is matched against DescribePhoneNumbers by its PhoneNumber field.',
  },
  {
    name: 'AWS_SMS_OPT_OUT_LIST_NAME',
    required: false,
    summary: 'Opt-out list to associate with the number (per environment).',
    detail: 'The list must already exist; create it once with: aws pinpoint-sms-voice-v2 create-opt-out-list --opt-out-list-name <name>. If unset, the number keeps whatever list it has — deliberate, so we never force a shared "Default" list across environments.',
  },
  {
    name: 'AWS_SMS_INBOUND_TOPIC_ARN',
    required: true,
    summary: 'SNS topic ARN for two-way (inbound) SMS, provisioned as infra per environment.',
    detail: 'The topic must already exist. This script enables two-way messaging, which AWS rejects without a channel ARN.',
  },
  {
    name: 'AWS_SMS_REGION',
    required: false,
    summary: 'AWS region for the SMS API. Defaults to us-west-2.',
  },
];

// Required vars that aren't set. Empty = good to go.
export function missingRequiredEnv (env = process.env) {
  return ENV_VARS.filter((v) => v.required && !env[v.name]).map((v) => v.name);
}

// Whether this environment looks like it intends to do SMS at all. Used to tell
// "SMS isn't set up here" apart from "SMS is half set up", which is a mistake.
export function isSmsConfigured (env = process.env) {
  return ENV_VARS.some((v) => env[v.name]);
}

// Human-readable environment contract, shared by --help and the preflight failure.
export function formatEnvHelp (env = process.env) {
  const line = (v) => {
    const set = env[v.name] ? 'set' : 'NOT SET';
    const tag = v.required ? 'required' : 'optional';
    const detail = v.detail ? `\n      ${v.detail}` : '';
    return `  ${v.name}  (${tag}, currently ${set})\n      ${v.summary}${detail}`;
  };
  return [
    'Environment:',
    ...ENV_VARS.filter((v) => v.required).map(line),
    '',
    ...ENV_VARS.filter((v) => !v.required).map(line),
  ].join('\n');
}
