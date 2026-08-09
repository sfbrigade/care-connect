import mailer from '#lib/mailer.js';

// Wrapper for sending SMS via AWS End User Messaging SMS (pinpoint-sms-voice-v2 API)
// Requires IAM user with "sms-voice:SendTextMessage".

// In production, set SMS_TRANSPORT="aws".
// To facilitate local testing, set SMS_TRANSPORT="email", which will render
// each outbound notif as an email (which a developer can view in MailCatcher.)

let client;
let sdk;

async function loadSdk () {
  if (!sdk) {
    sdk = await import('@aws-sdk/client-pinpoint-sms-voice-v2');
  }
  return sdk;
}

async function init () {
  if (!client) {
    const { PinpointSMSVoiceV2Client } = await loadSdk();
    client = new PinpointSMSVoiceV2Client({
      credentials: {
        accessKeyId: process.env.AWS_SMS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SMS_SECRET_ACCESS_KEY,
      },
      region: process.env.AWS_SMS_REGION ?? 'us-west-2',
    });
  }
}

function hasAwsSms () {
  return Boolean(
    process.env.AWS_SMS_ACCESS_KEY_ID &&
    process.env.AWS_SMS_SECRET_ACCESS_KEY &&
    process.env.AWS_SMS_ORIGINATION_NUMBER
  );
}

function resolveTransport () {
  const configured = process.env.SMS_TRANSPORT?.toLowerCase();
  if (configured) return configured;
  if (hasAwsSms()) return 'aws';
  if (process.env.SMTP_ENABLED === 'true') return 'email';
  return 'log';
}

async function sendViaAws ({ to, body }) {
  await init();
  const { SendTextMessageCommand } = await loadSdk();
  return client.send(
    new SendTextMessageCommand({
      DestinationPhoneNumber: to,
      OriginationIdentity: process.env.AWS_SMS_ORIGINATION_NUMBER,
      MessageBody: body,
      MessageType: 'TRANSACTIONAL',
    })
  );
}

async function sendViaEmail ({ to, body }) {
  // By default, send to `sms-debug+<phone_number>@careconnect.local`.
  // Can override by setting SMS_DEBUG_EMAIL.
  const recipient = process.env.SMS_DEBUG_EMAIL || `sms-debug+${to}@careconnect.local`;
  return mailer.send({
    message: { to: recipient },
    template: 'sms-debug',
    locals: { to, body },
  });
}

/**
 * Send a notification (as an SMS message, email, or log line)
 * @param {{ to: string, body: string }} params - E.164 destination + message body.
 */
async function sendText ({ to, body }) {
  const transport = resolveTransport();
  switch (transport) {
    case 'aws':
      return sendViaAws({ to, body });
    case 'email':
      return sendViaEmail({ to, body });
    case 'log':
    default:
      console.log(JSON.stringify({ event: 'sms/send', transport, to, body }));
      return null;
  }
}

// Remove a number from our AWS opt-out list so we can send to it again.
// We must run this when an opted-out user sends the text START or UNSTOP.
// Otherwise, AWS continues to block outbound messages, even if the carrier does not.
async function optInNumber (phoneNumber) {
  if (resolveTransport() !== 'aws') return null;
  await init();
  const { DeleteOptedOutNumberCommand } = await loadSdk();
  const OptOutListName = process.env.AWS_SMS_OPT_OUT_LIST_NAME || 'Default';
  try {
    return await client.send(
      new DeleteOptedOutNumberCommand({ OptOutListName, OptedOutNumber: phoneNumber })
    );
  } catch (err) {
    // Not on the list = already opted in; nothing to do.
    if (err.name === 'ResourceNotFoundException') return null;
    throw err;
  }
}

// Look up a number's current status on our AWS opt-out list (read-only; for the
// admin SMS diagnostic). Our own smsOptedOutAt is only a MIRROR of this list and can
// drift from it, so surfacing AWS's own truth is the point. Returns:
//   { available: true, optedOut: false }
//   { available: true, optedOut: true, optedOutTimestamp, endUserOptedOut }
//   { available: false, reason }  — not the 'aws' transport, no number, or an API error.
// Querying a single number that isn't on the list throws ResourceNotFoundException,
// which we treat as "not opted out" (matches AWS's DescribeOptedOutNumbers behavior).
async function describeOptOutStatus (phoneNumber) {
  if (resolveTransport() !== 'aws') return { available: false, reason: 'not-aws-transport' };
  if (!phoneNumber) return { available: false, reason: 'no-number' };
  await init();
  const { DescribeOptedOutNumbersCommand } = await loadSdk();
  const OptOutListName = process.env.AWS_SMS_OPT_OUT_LIST_NAME || 'Default';
  try {
    const response = await client.send(
      new DescribeOptedOutNumbersCommand({ OptOutListName, OptedOutNumbers: [phoneNumber] })
    );
    const entry = (response.OptedOutNumbers ?? [])[0];
    if (!entry) return { available: true, optedOut: false };
    return {
      available: true,
      optedOut: true,
      optedOutTimestamp: entry.OptedOutTimestamp ?? null,
      endUserOptedOut: entry.EndUserOptedOut ?? null,
    };
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') return { available: true, optedOut: false };
    return { available: false, reason: err.name || 'error' };
  }
}

// Reset cached client (used by tests)
function reset () {
  client = undefined;
  sdk = undefined;
}

export default {
  sendText,
  optInNumber,
  describeOptOutStatus,
  resolveTransport,
  reset,
};
