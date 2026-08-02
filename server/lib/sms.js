import mailer from '#lib/mailer.js';

// AWS End User Messaging SMS (the pinpoint-sms-voice-v2 API) wrapper for
// outbound text messages (D1). Real sends require an IAM user with
// "sms-voice:SendTextMessage" and an origination identity (the leased toll-free
// number). Set AWS_SMS_* in .env — see server/example.env.
//
// The AWS SDK is imported lazily (dynamic import) so this module loads — and dev
// runs — even before "@aws-sdk/client-pinpoint-sms-voice-v2" is installed and
// before AWS onboarding is complete. Only the 'aws' transport touches the SDK.
//
// Transport selection (SMS_TRANSPORT) lets the whole pipeline run in dev before
// the toll-free number is live. The pipeline (notifier → job → this send) is
// identical across transports; only the final hop differs:
//   - 'aws'   → real End User Messaging send.
//   - 'email' → render the SMS body into an email to the local mailcatcher, so
//               "texts" are readable at http://localhost:1080 (dev default).
//   - 'log'   → console.log only.
// When SMS_TRANSPORT is unset we auto-pick: 'aws' if AWS creds + origination
// number are present, else 'email' if SMTP is enabled, else 'log'. Set
// SMS_TRANSPORT explicitly to override (e.g. force 'email' even with AWS creds,
// to avoid texting real phones during dev — the recommended hybrid while
// testing: real AWS for verification/OTP, email shim for the notification blast).

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
  // mailcatcher accepts any recipient; encode the destination number so the
  // debug inbox is legible. Override with SMS_DEBUG_EMAIL if desired.
  const recipient = process.env.SMS_DEBUG_EMAIL || `sms-debug+${to}@careconnect.local`;
  return mailer.send({
    message: { to: recipient },
    template: 'sms-debug',
    locals: { to, body },
  });
}

/**
 * Send an SMS text message. Routed through the configured transport (see above).
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

// Phone verification (D6) is self-managed over sendText() — see lib/smsOtp.js.
// (AWS *managed* OTP, SendOTPMessage/VerifyOTPMessage, is NOT in End User
// Messaging / pinpoint-sms-voice-v2; it's v1 Amazon Pinpoint, which is closed to
// new accounts — so we roll our own on top of sendText.)

// Remove a number from our AWS opt-out list so we can send to it again. AWS
// auto-adds numbers to the list on an inbound STOP (managed opt-outs) but NEVER
// auto-removes on START — there's no START keyword and no opt-in keyword action, so
// the carrier's own "you'll receive messages again" reply does NOT clear AWS's
// list, and SendTextMessage keeps failing with DESTINATION_PHONE_NUMBER_OPTED_OUT.
// This is how an inbound START (D3) actually restores delivery. No-op for non-aws
// transports; a number that isn't on the list is treated as success (idempotent).
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

// Reset cached client (used by tests, mirrors lib/s3.js).
function reset () {
  client = undefined;
  sdk = undefined;
}

export default {
  sendText,
  optInNumber,
  resolveTransport,
  reset,
};
