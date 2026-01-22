import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Invite from '#models/invite.js';

const BulkInviteItemSchema = Invite.AttibutesSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
});

const BulkInviteRequestSchema = z.object({
  invites: z.array(BulkInviteItemSchema).min(1),
});

const BulkInviteErrorSchema = z.object({
  email: z.string().email(),
  message: z.string(),
});

const BulkInviteResponseSchema = z.object({
  invitedCount: z.number(),
  existingCount: z.number(),
  errorCount: z.number(),
  errors: z.array(BulkInviteErrorSchema),
});

export default async function (fastify, opts) {
  fastify.post('/bulk',
    {
      schema: {
        description: 'Creates multiple Invites and sends them via email.',
        body: BulkInviteRequestSchema,
        response: {
          [StatusCodes.OK]: BulkInviteResponseSchema,
        },
      },
      onRequest: fastify.requireAdmin,
    },
    async function (request, reply) {
      const { invites } = request.body;
      let invitedCount = 0;
      let existingCount = 0;
      const errors = [];

      for (const inviteInput of invites) {
        const email = inviteInput.email.trim().toLowerCase();
        const firstName = inviteInput.firstName.trim();
        const lastName = inviteInput.lastName.trim();

        try {
          const existingUser = await fastify.prisma.user.findUnique({
            where: { email },
          });
          if (existingUser) {
            existingCount += 1;
            continue;
          }

          const existingInvite = await fastify.prisma.invite.findFirst({
            where: {
              email,
              acceptedAt: null,
              revokedAt: null,
            },
          });
          if (existingInvite) {
            existingCount += 1;
            continue;
          }

          const data = await fastify.prisma.invite.create({
            data: {
              firstName,
              lastName,
              email,
              createdById: request.user.id,
            },
          });
          const invite = new Invite(data);
          await invite.sendInviteEmail(request.facility);
          invitedCount += 1;
        } catch (error) {
          errors.push({
            email,
            message: error?.message ?? 'Failed to invite user.',
          });
        }
      }

      return reply.code(StatusCodes.OK).send({
        invitedCount,
        existingCount,
        errorCount: errors.length,
        errors,
      });
    });
}
