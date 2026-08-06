import prisma from '#prisma/client.js';
import sms from '#lib/sms.js';

// Handles inbound SMS replies (D3 / Phase 8). The transport (SQS poller) feeds us
// { fromNumber, body }; this module maps the number to a user and applies the
// keyword. MUTE/UNMUTE toggle our app's notificationsEnabled (SMS→app sync);
// STOP/START sync the carrier opt-out into smsOptedOutAt so we stop trying to send
// to opted-out numbers; HELP gets an info reply.

const MUTE_WORDS = ['MUTE'];
const UNMUTE_WORDS = ['UNMUTE'];
// Reserved opt-out/opt-in keywords: the carrier enforces the actual block; we just
// mirror it into smsOptedOutAt.
const OPTOUT_WORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT'];
const OPTIN_WORDS = ['START', 'UNSTOP', 'YES', 'OPTIN'];
const HELP_WORDS = ['HELP', 'INFO'];
// Reply sent to a known user for any message we can't otherwise handle. Keep this in
// sync with the AWS HELP keyword auto-response (which answers the reserved HELP
// keyword), so both paths return identical copy.
const FALLBACK_MESSAGE = 'CareConnect: Reply MUTE to pause notifications, UNMUTE to resume. For assistance, email careconnect@sfgov.org.';

// SQS body → { fromNumber, body }, or null if not a usable inbound SMS event.
// Handles both raw-message-delivery (the End User Messaging event directly) and
// the SNS envelope (event JSON nested under `Message`).
export function parseInboundSqsBody (raw) {
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (obj && obj.Type === 'Notification' && typeof obj.Message === 'string') {
    try {
      obj = JSON.parse(obj.Message);
    } catch {
      return null;
    }
  }
  const fromNumber = obj?.originationNumber;
  const body = obj?.messageBody;
  if (!fromNumber || body == null) return null;
  return { fromNumber, body };
}

// Best-effort reply; never throw out of here (e.g. AWS blocks replies to
// opted-out numbers, which is expected).
async function reply (to, body) {
  try {
    await sms.sendText({ to, body });
  } catch (err) {
    console.error('[sms-inbound] reply failed:', err.message);
  }
}

// Apply an inbound keyword for the user with this phone number. Returns a small
// result object (handy for logging/tests). `prismaClient` overridable for tests.
export async function handleInboundSms ({ fromNumber, body }, prismaClient = prisma) {
  const keyword = (body ?? '').trim().split(/\s+/)[0]?.toUpperCase() ?? '';
  const user = await prismaClient.user.findFirst({ where: { phoneNumber: fromNumber } });
  if (!user) {
    console.log('[sms-inbound] no user for', fromNumber, '— ignoring', keyword);
    return { action: 'no-user' };
  }

  if (MUTE_WORDS.includes(keyword)) {
    await prismaClient.user.update({ where: { id: user.id }, data: { notificationsEnabled: false } });
    await reply(fromNumber, 'CareConnect: SMS notifications muted. Reply UNMUTE to resume.');
    return { action: 'mute' };
  }
  if (UNMUTE_WORDS.includes(keyword)) {
    await prismaClient.user.update({ where: { id: user.id }, data: { notificationsEnabled: true } });
    await reply(fromNumber, 'CareConnect: SMS notifications unmuted.');
    return { action: 'unmute' };
  }
  if (OPTOUT_WORDS.includes(keyword)) {
    // Record the opt-out so we stop sending. NO reply — the carrier sends the
    // mandatory confirmation, and we must not message an opted-out number.
    await prismaClient.user.update({ where: { id: user.id }, data: { smsOptedOutAt: new Date() } });
    return { action: 'optout' };
  }
  if (OPTIN_WORDS.includes(keyword)) {
    // Clear our flag AND remove the number from AWS's opt-out list — AWS doesn't
    // auto-clear on START, so without the second step our sends keep bouncing with
    // DESTINATION_PHONE_NUMBER_OPTED_OUT. The carrier sends its own confirmation, so
    // we don't reply. optInNumber is best-effort: the DB flag is already cleared.
    await prismaClient.user.update({ where: { id: user.id }, data: { smsOptedOutAt: null } });
    try {
      await sms.optInNumber(fromNumber);
    } catch (err) {
      console.error('[sms-inbound] optInNumber failed:', err.message);
    }
    return { action: 'optin' };
  }
  if (HELP_WORDS.includes(keyword)) {
    // HELP is a reserved compliance keyword answered by the AWS keyword
    // auto-response; we must NOT also reply, or the user gets two texts.
    return { action: 'help' };
  }

  // Any other message from a known user: reply with the fallback so a mistyped
  // command still points them to MUTE/UNMUTE/support. Unknown numbers returned
  // above, so we never text strangers.
  console.log('[sms-inbound] unrecognized keyword from', fromNumber, ':', keyword);
  await reply(fromNumber, FALLBACK_MESSAGE);
  return { action: 'ignored', keyword };
}
