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
  // Start (or restart) phone verification: capture consent, text an OTP code, and
  // store the number (unverified) once the code has actually been sent.
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
      const consentingNow = consent && acceptedTerms;
      if (!request.user.smsConsentAt && !consentingNow) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'You must consent to SMS and accept the terms.' });
      }
      // If phone number is already taken, show error.
      const takenBy = await fastify.prisma.user.findFirst({
        where: { phoneNumber, id: { not: request.user.id } },
        select: { id: true },
      });
      if (takenBy) {
        return reply.code(StatusCodes.CONFLICT).send({ error: 'This mobile number is already in use with another account. Enter a different mobile number.' });
      }

      const remaining = resendCooldownRemaining(request.user.smsOtpLastSentAt);
      if (remaining > 0) {
        return reply.code(StatusCodes.TOO_MANY_REQUESTS).send({ error: `Please wait ${remaining}s before requesting another code.`, resendAvailableInSeconds: remaining });
      }

      // Send the code FIRST, then persist the number change only on success — a failed
      // send (opted-out / unreachable number, AWS blip) must not clobber the user's
      // existing verified number.
      try {
        await sendVerificationCode(
          fastify.prisma,
          { id: request.user.id, phoneNumber },
          { phoneNumber, phoneVerifiedAt: null, ...(consentingNow ? { smsConsentAt: new Date() } : {}) }
        );
      } catch (err) {
        if (err?.code === 'SMS_SEND_FAILED') {
          request.log.error({ err: err.cause }, 'OTP send failed on /me/phone/start');
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: 'We couldn’t send a verification code to that number. Check that it’s correct and try again.' });
        }
        if (err?.code === 'P2002') {
          return reply.code(StatusCodes.CONFLICT).send({ error: 'This mobile number is already in use with another account. Enter a different mobile number.' });
        }
        throw err;
      }
      return reply.send({ phoneNumber, resendAvailableInSeconds: RESEND_COOLDOWN_S });
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
      try {
        await sendVerificationCode(fastify.prisma, request.user);
      } catch (err) {
        if (err?.code === 'SMS_SEND_FAILED') {
          request.log.error({ err: err.cause }, 'OTP resend failed on /me/phone/resend');
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({ error: 'We couldn’t resend the code right now. Please try again in a moment.' });
        }
        throw err;
      }
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
