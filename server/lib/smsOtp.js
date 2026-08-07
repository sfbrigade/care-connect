import crypto from 'node:crypto';

import sms from '#lib/sms.js';

// Self-managed OTP generation and verification for SMS phone verification

export const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const RESEND_COOLDOWN_S = 30;
export const MAX_ATTEMPTS = 5;

export function generateCode () {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// Seconds the user must still wait before a resend is allowed (0 if allowed now).
export function resendCooldownRemaining (lastSentAt) {
  if (!lastSentAt) return 0;
  const elapsed = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_S - elapsed));
}

// Text a code to the user's (pending) number, persisting it only AFTER a successful
// send — so a failed send never leaves a code (or, via `extraPersist`, a number change)
// for a message that never arrived. A failed send still stamps smsOtpLastSentAt (the
// attempt counts against the resend cooldown — anti-flooding), then throws a tagged
// SMS_SEND_FAILED error for the route to map to a 4xx. `extraPersist` lets /start fold
// the number change into the same success-only write.
export async function sendVerificationCode (prisma, user, extraPersist = {}) {
  const code = generateCode();
  try {
    await sms.sendText({
      to: user.phoneNumber,
      body: `CareConnect: ${code} is your verification code. Do not share this code with anyone.`,
    });
  } catch (err) {
    await prisma.user.update({ where: { id: user.id }, data: { smsOtpLastSentAt: new Date() } });
    const failure = new Error('Could not send the verification code');
    failure.code = 'SMS_SEND_FAILED';
    failure.cause = err;
    throw failure;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...extraPersist,
      smsOtpCode: code,
      smsOtpExpiresAt: new Date(Date.now() + CODE_TTL_MS),
      smsOtpAttempts: 0,
      smsOtpLastSentAt: new Date(),
    },
  });
}

// Validate a submitted code against the stored one.
export async function checkVerificationCode (prisma, user, code) {
  if (!user.smsOtpCode) {
    return { status: 400, error: 'No verification in progress. Request a code first.' };
  }
  if (user.smsOtpAttempts >= MAX_ATTEMPTS) {
    return { status: 429, error: 'Too many attempts. Request a new code.' };
  }
  if (new Date() > new Date(user.smsOtpExpiresAt)) {
    return { status: 410, error: 'That code has expired. Request a new one.' };
  }
  if (code !== user.smsOtpCode) {
    await prisma.user.update({
      where: { id: user.id },
      data: { smsOtpAttempts: { increment: 1 } },
    });
    return { status: 422, error: 'That code is incorrect. Try again.' };
  }
  return { ok: true };
}

// Fields to clear once verification succeeds (or is abandoned).
export const CLEARED_OTP_FIELDS = {
  smsOtpCode: null,
  smsOtpExpiresAt: null,
  smsOtpAttempts: 0,
  smsOtpLastSentAt: null,
};
