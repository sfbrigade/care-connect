import sms from '#lib/sms.js';

// Opt-in outcomes returned by sms.attemptOptIn. 'blocked_30_day' is AWS's once-per-30-days
// opt-in limit — a hard limit with no override; the caller surfaces it to the admin.
export const OPT_IN_OUTCOME = { RESTORED: 'restored', BLOCKED_30_DAY: 'blocked_30_day', ERROR: 'error' };

// Restore SMS delivery for a number (opt_in): attempt to clear the AWS opt-out, and on
// success clear our own smsOptedOutAt mirror. Shared by the inbound START handler and the
// admin "override opt-out" action. Every attempt is logged to SmsOptEvent (both sources,
// keyed by number — this backs the 30-day-limit history/prediction). Admin-initiated
// attempts ALSO write an AdminSecurityEvent for the security audit. All DB writes run in
// one transaction (from a single computed outcome), so the two audit rows and the flag
// clear can't diverge. Returns { outcome, awsReason }.
export async function restoreDelivery (prisma, { phoneNumber, userId = null, source, actorUserId = null }) {
  // The AWS call is outside the transaction below (it's an external API). If AWS succeeds
  // but the DB transaction then fails, we're left AWS-clear / DB-still-opted-out — the
  // reverse drift. That's self-healing: the next attempt returns ResourceNotFound →
  // 'restored' → clears our flag. So the window is transient, not corrupting.
  const { outcome, awsReason = null } = await sms.attemptOptIn(phoneNumber);
  const restored = outcome === OPT_IN_OUTCOME.RESTORED;

  await prisma.$transaction(async (tx) => {
    // Clear our mirror only when the number is actually deliverable again — otherwise
    // we'd resume attempting sends that AWS still bounces (the drift we guard against).
    if (restored && userId) {
      await tx.user.update({ where: { id: userId }, data: { smsOptedOutAt: null } });
    }
    await tx.smsOptEvent.create({
      data: { phoneNumber, action: 'opt_in', source, outcome, awsReason, actorUserId, targetUserId: userId },
    });
    if (source === 'admin' && actorUserId && userId) {
      await tx.adminSecurityEvent.create({
        data: {
          action: 'USER_SMS_RESTORE_DELIVERY',
          actorUserId,
          targetUserId: userId,
          metadata: { outcome, awsReason },
        },
      });
    }
  });

  return { outcome, awsReason };
}

// Record an opt-out (opt_out): set our smsOptedOutAt mirror and log the event. Called from
// the inbound STOP handler. The carrier enforces the actual block; we just mirror + log it,
// so the opt-out shows up in the same history as the opt-ins. One transaction.
export async function recordOptOut (prisma, { phoneNumber, userId, source }) {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { smsOptedOutAt: new Date() } });
    await tx.smsOptEvent.create({
      data: { phoneNumber, action: 'opt_out', source, outcome: 'recorded', targetUserId: userId },
    });
  });
}
