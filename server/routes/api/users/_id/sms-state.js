import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import User from '#models/user.js';
import sms from '#lib/sms.js';
import { EVENT_AUDIENCE, smsGateChecks, smsGateResult } from '#lib/smsAudience.js';

// Admin SMS diagnostic (read-only). Surfaces a user's full SMS enrollment state, the
// recipient-gate result per event (WHY they would/wouldn't receive notifications),
// and — the point of the tool — the number's LIVE status on AWS's opt-out list, which
// our own smsOptedOutAt only mirrors and can drift from. See issue #990.

const events = Object.keys(EVENT_AUDIENCE);

const GateCheckSchema = z.object({
  key: z.string(),
  label: z.string(),
  passed: z.boolean(),
});

export default async function (fastify) {
  fastify.get('/sms-state',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: "Returns a user's SMS enrollment state, per-event recipient-gate results, and live AWS opt-out status (admin diagnostic).",
        params: z.object({ id: z.string().uuid() }),
        response: {
          [StatusCodes.OK]: z.object({
            state: z.object({
              phoneNumber: z.string().nullable(),
              phoneVerifiedAt: z.coerce.date().nullable(),
              smsConsentAt: z.coerce.date().nullable(),
              smsOptedOutAt: z.coerce.date().nullable(),
              notificationsEnabled: z.boolean(),
              subscribedEvents: z.array(z.string()),
              currentFacilityId: z.string().nullable(),
              currentFacilityName: z.string().nullable(),
              smsWelcomedAt: z.coerce.date().nullable(),
              roles: z.array(z.string()),
              deactivatedAt: z.coerce.date().nullable(),
              deletedAt: z.coerce.date().nullable(),
            }),
            otp: z.object({
              lastSentAt: z.coerce.date().nullable(),
              attempts: z.number(),
              expiresAt: z.coerce.date().nullable(),
            }),
            // Split so the UI needn't repeat identical global rows per event: `global`
            // conditions apply to every notification; `events` carries only the
            // event-specific conditions plus each event's overall verdict.
            gate: z.object({
              global: z.array(GateCheckSchema),
              events: z.array(z.object({
                event: z.string(),
                passed: z.boolean(),
                checks: z.array(GateCheckSchema),
              })),
            }),
            awsOptOut: z.object({
              available: z.boolean(),
              optedOut: z.boolean().optional(),
              optedOutTimestamp: z.coerce.date().nullable().optional(),
              endUserOptedOut: z.boolean().nullable().optional(),
              reason: z.string().optional(),
            }),
            // Recent opt-out / opt-in events for this number (inbound STOP/START + admin
            // override), plus an estimated earliest next opt-in (last success + 30 days).
            optHistory: z.object({
              events: z.array(z.object({
                at: z.coerce.date(),
                action: z.string(),
                source: z.string(),
                outcome: z.string().nullable(),
                awsReason: z.string().nullable(),
                actor: z.string().nullable(),
              })),
              nextAllowedAfter: z.coerce.date().nullable(),
            }),
          }),
          [StatusCodes.FORBIDDEN]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      if (id === User.BATCH_USER_ID) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const data = await fastify.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          roles: true,
          phoneNumber: true,
          phoneVerifiedAt: true,
          smsConsentAt: true,
          smsOptedOutAt: true,
          notificationsEnabled: true,
          subscribedEvents: true,
          currentFacilityId: true,
          currentFacility: { select: { name: true } },
          smsWelcomedAt: true,
          smsOtpLastSentAt: true,
          smsOtpAttempts: true,
          smsOtpExpiresAt: true,
          deactivatedAt: true,
          deletedAt: true,
        },
      });

      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      // Live AWS opt-out status — best-effort; never fail the diagnostic over it.
      const awsOptOut = await sms.describeOptOutStatus(data.phoneNumber);

      // Per-event gate: a user receives events at their OWN current facility (the
      // atFacility check null-guards a no-facility user, so every event fails outright).
      // The live AWS opt-out is authoritative and blocks delivery even when our own
      // smsOptedOutAt mirror is clear (the send would bounce), so — whenever we could
      // check AWS — include it as its own gate condition. Omitted only when the AWS
      // status is unavailable (non-aws transport / API error), since we can't assert it.
      const awsAvailable = awsOptOut.available === true;

      // Event-specific condition keys (audience, subscription); everything else is a
      // GLOBAL prerequisite whose value is identical across events — so we render it
      // once. The AWS opt-out (key 'awsNotOptedOut', added below) is global too.
      const eventSpecificKeys = new Set(
        smsGateChecks({ event: events[0], facilityId: data.currentFacilityId })
          .filter((c) => c.eventSpecific)
          .map((c) => c.key)
      );

      const perEvent = events.map((event) => {
        const result = smsGateResult(data, { event, facilityId: data.currentFacilityId });
        let checks = result.checks;
        let passed = result.passed;
        if (awsAvailable) {
          // Insert right after the internal-DB opt-out check so the two opt-out rows
          // sit adjacent in the global list.
          const awsCheck = { key: 'awsNotOptedOut', label: 'Not opted out (AWS)', passed: !awsOptOut.optedOut };
          const i = checks.findIndex((c) => c.key === 'notOptedOut');
          checks = i === -1
            ? [...checks, awsCheck]
            : [...checks.slice(0, i + 1), awsCheck, ...checks.slice(i + 1)];
          if (awsOptOut.optedOut) passed = false;
        }
        return { event, passed, checks };
      });

      const gate = {
        // Global rows are identical across events, so take them from the first.
        global: perEvent[0].checks.filter((c) => !eventSpecificKeys.has(c.key)),
        events: perEvent.map((e) => ({
          event: e.event,
          passed: e.passed,
          checks: e.checks.filter((c) => eventSpecificKeys.has(c.key)),
        })),
      };

      // Opt-out / opt-in history for this number, most recent first. The last opt_in with
      // outcome 'restored' + 30 days estimates the earliest next opt-in AWS would allow — a
      // lower bound only (STOP/START or console opt-ins we didn't record also consume the
      // window; see the UI copy).
      const OPT_IN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
      const rawEvents = data.phoneNumber
        ? await fastify.prisma.smsOptEvent.findMany({
          where: { phoneNumber: data.phoneNumber },
          orderBy: { createdAt: 'desc' },
          take: 15,
        })
        : [];
      const actorIds = [...new Set(rawEvents.map((e) => e.actorUserId).filter(Boolean))];
      const actors = actorIds.length
        ? await fastify.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true } })
        : [];
      const actorName = Object.fromEntries(actors.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
      const historyEvents = rawEvents.map((e) => ({
        at: e.createdAt,
        action: e.action,
        source: e.source,
        outcome: e.outcome,
        awsReason: e.awsReason,
        actor: e.actorUserId ? (actorName[e.actorUserId] ?? null) : null,
      }));
      const lastRestored = rawEvents.find((e) => e.action === 'opt_in' && e.outcome === 'restored');
      const nextAllowedAfter = lastRestored ? new Date(lastRestored.createdAt.getTime() + OPT_IN_WINDOW_MS) : null;

      await fastify.prisma.adminSecurityEvent.create({
        data: {
          action: 'USER_SMS_STATE_VIEWED',
          actorUserId: request.user.id,
          targetUserId: id,
        },
      });

      reply.header('Cache-Control', 'no-store');

      return reply.send({
        state: {
          phoneNumber: data.phoneNumber,
          phoneVerifiedAt: data.phoneVerifiedAt,
          smsConsentAt: data.smsConsentAt,
          smsOptedOutAt: data.smsOptedOutAt,
          notificationsEnabled: data.notificationsEnabled,
          subscribedEvents: data.subscribedEvents,
          currentFacilityId: data.currentFacilityId,
          currentFacilityName: data.currentFacility?.name ?? null,
          smsWelcomedAt: data.smsWelcomedAt,
          roles: data.roles,
          deactivatedAt: data.deactivatedAt,
          deletedAt: data.deletedAt,
        },
        otp: {
          lastSentAt: data.smsOtpLastSentAt,
          attempts: data.smsOtpAttempts,
          expiresAt: data.smsOtpExpiresAt,
        },
        gate,
        awsOptOut,
        optHistory: { events: historyEvents, nextAllowedAfter },
      });
    });
}
