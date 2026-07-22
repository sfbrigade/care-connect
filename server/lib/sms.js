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

// --- Phone verification / OTP ---------------------------------------------
//
// TO BE IMPLEMENTED IN PHASE 4 as SELF-MANAGED OTP over sendText() above.
//
// Background (revises D6): AWS *managed* OTP (SendOTPMessage / VerifyOTPMessage)
// is NOT in End User Messaging / pinpoint-sms-voice-v2 (only SendTextMessage) —
// it lives in the v1 Amazon Pinpoint API, which is application-scoped and stopped
// accepting new customers on 2025-05-20. This is a new account, so managed OTP
// is unavailable to us. Instead: generate a code → store it + expiry + attempts
// on User → sms.sendText the code → compare on verify. Mirror the existing
// login-MFA fields/logic (mfaCode / mfaExpiresAt / mfaAttempts / mfaLastSentAt),
// but with SEPARATE SMS-OTP fields so the phone-verification and login-MFA flows
// don't collide. Left unimplemented until Phase 4.

async function sendOtp () {
  throw new Error(
    'sms.sendOtp not implemented — OTP transport is pending a design decision. ' +
    'AWS managed OTP is a legacy Pinpoint operation, not available in End User ' +
    'Messaging v2. See docs/sms-notifications-technical-plan.md.'
  );
}

async function verifyOtp () {
  throw new Error(
    'sms.verifyOtp not implemented — OTP transport is pending a design decision. ' +
    'See docs/sms-notifications-technical-plan.md.'
  );
}

// Reset cached client (used by tests, mirrors lib/s3.js).
function reset () {
  client = undefined;
  sdk = undefined;
}

export default {
  sendText,
  sendOtp,
  verifyOtp,
  resolveTransport,
  reset,
};
