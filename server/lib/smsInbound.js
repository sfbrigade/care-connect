import prisma from '#prisma/client.js';
import sms from '#lib/sms.js';

// Handles inbound SMS replies:
// - MUTE/UNMUTE toggles user's in-app Mute status
// - STOP/START are carrier-level opt-in/out keywords; we record those to 
//   User.smsOptedOutAt (so that we don't send messages that will bounce)
// - HELP (or any other message) gets a standard help reply

const MUTE_WORDS = ['MUTE'];
const UNMUTE_WORDS = ['UNMUTE'];

// Reserved opt-out/opt-in keywords enforced by the carrier
const OPTOUT_WORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT'];
const OPTIN_WORDS = ['START', 'UNSTOP', 'YES', 'OPTIN'];
const HELP_WORDS = ['HELP', 'INFO'];

// Reply sent to a known user for any message we can't otherwise handle. 
// Keep this in sync with the AWS HELP keyword auto-response (which answers the reserved HELP
// keyword), so both paths return identical copy.
const FALLBACK_MESSAGE = 'CareConnect: Reply MUTE to pause notifications, UNMUTE to resume. For assistance, email careconnect@sfgov.org.';

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
    await prismaClient.user.update({ where: { id: user.id }, data: { smsOptedOutAt: new Date() } });
    return { action: 'optout' };
  }
  if (OPTIN_WORDS.includes(keyword)) {
    // Remove the number from AWS's opt-out list, THEN clear local opt-out record
    try {
      await sms.optInNumber(fromNumber);
      await prismaClient.user.update({ where: { id: user.id }, data: { smsOptedOutAt: null } });
      return { action: 'optin' };
    } catch (err) {
      console.error('[sms-inbound] optInNumber failed:', err.message);
      return { action: 'optin', ok: false };
    }
  }
  if (HELP_WORDS.includes(keyword)) {
    // HELP is a reserved keyword answered automatically by AWS; we
    // explicitly do NOT respond here (users would get two texts)
    return { action: 'help' };
  }

  // Else return the standard fallback message
  console.log('[sms-inbound] unrecognized keyword from', fromNumber, ':', keyword);
  await reply(fromNumber, FALLBACK_MESSAGE);
  return { action: 'ignored', keyword };
}
