import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';
import {
  RESEND_COOLDOWN_S,
  resendCooldownRemaining,
  sendVerificationCode,
  checkVerificationCode,
  CLEARED_OTP_FIELDS,
} from '#lib/smsOtp.js';

// E.164, e.g. +14155550123. The client formats the typed number into this shape.
const E164 = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Enter a valid phone number');

const ResendStatusSchema = z.object({
  phoneNumber: z.string(),
  resendAvailableInSeconds: z.number(),
});

export default async function (fastify, opts) {
  // Start (or restart) phone verification: capture consent, store the number as
  // unverified, and text a code. Self-managed OTP (D6).
  fastify.post('/me/phone/start',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Begin SMS phone verification: store the number (unverified), record consent, and send a code.',
        body: z.object({
          phoneNumber: E164,
          consent: z.boolean().optional(),
          acceptedTerms: z.boolean().optional(),
        }),
        response: { [StatusCodes.OK]: ResendStatusSchema },
      },
    },
    async function (request, reply) {
      const { phoneNumber, consent, acceptedTerms } = request.body;
      // Consent is required for first-time enrollment; a user who already consented
      // (e.g. changing their number from Contact details) need not re-consent.
      const consentingNow = consent && acceptedTerms;
      if (!request.user.smsConsentAt && !consentingNow) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'You must consent to SMS and accept the terms.' });
      }
      // Reject a number already verified on another account (designer edge case).
      const takenBy = await fastify.prisma.user.findFirst({
        where: { phoneNumber, phoneVerifiedAt: { not: null }, id: { not: request.user.id } },
        select: { id: true },
      });
      if (takenBy) {
        return reply.code(StatusCodes.CONFLICT).send({ error: 'That number is already in use on another account. Please enter a different number.' });
      }
      const remaining = resendCooldownRemaining(request.user.smsOtpLastSentAt);
      if (remaining > 0) {
        return reply.code(StatusCodes.TOO_MANY_REQUESTS).send({ error: `Please wait ${remaining}s before requesting another code.`, resendAvailableInSeconds: remaining });
      }
      // Store the (unverified) number; stamp consent only when consenting now.
      await fastify.prisma.user.update({
        where: { id: request.user.id },
        data: { phoneNumber, phoneVerifiedAt: null, ...(consentingNow ? { smsConsentAt: new Date() } : {}) },
      });
      // Initial send does not arm the resend cooldown → user may resend once now.
      await sendVerificationCode(fastify.prisma, { id: request.user.id, phoneNumber }, { startsResendCooldown: false });
      return reply.send({ phoneNumber, resendAvailableInSeconds: 0 });
    });

  // Resend the code to the pending (unverified) number, subject to the cooldown.
  fastify.post('/me/phone/resend',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Resend the SMS verification code to the pending phone number.',
        response: { [StatusCodes.OK]: ResendStatusSchema },
      },
    },
    async function (request, reply) {
      if (!request.user.phoneNumber) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'No phone number to verify. Start verification first.' });
      }
      if (request.user.phoneVerifiedAt) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'This number is already verified.' });
      }
      const remaining = resendCooldownRemaining(request.user.smsOtpLastSentAt);
      if (remaining > 0) {
        return reply.code(StatusCodes.TOO_MANY_REQUESTS).send({ error: `Please wait ${remaining}s before requesting another code.`, resendAvailableInSeconds: remaining });
      }
      await sendVerificationCode(fastify.prisma, request.user);
      return reply.send({ phoneNumber: request.user.phoneNumber, resendAvailableInSeconds: RESEND_COOLDOWN_S });
    });

  // Verify the submitted code; on success mark the phone verified.
  fastify.post('/me/phone/verify',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Verify the SMS code and mark the phone number as verified.',
        body: z.object({ code: z.string().length(6) }),
        response: { [StatusCodes.OK]: User.ResponseSchema },
      },
    },
    async function (request, reply) {
      const { code } = request.body;
      const result = await checkVerificationCode(fastify.prisma, request.user, code);
      if (!result.ok) {
        return reply.code(result.status).send({ error: result.error });
      }
      const now = new Date();
      const data = await fastify.prisma.user.update({
        where: { id: request.user.id },
        data: {
          phoneVerifiedAt: now,
          smsConsentAt: request.user.smsConsentAt ?? now,
          ...CLEARED_OTP_FIELDS,
        },
        include: { organization: true, title: true, unit: true },
      });
      return reply.send(new User(data));
    });
}
