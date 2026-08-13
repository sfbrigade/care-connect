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
