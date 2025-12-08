import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '../../lib/holds.js';

export default async function (fastify, opts) {
  fastify.get('/:id/for-checkin',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Get hold by ID for check-in purposes. Allows any authenticated user to view hold details. Accepts either full UUID or 3-character code.',
        params: z.object({
          id: z.string().min(1),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            id: z.string().uuid(),
            facilityId: z.string().uuid(),
            facilityName: z.string(),
            serviceTypeId: z.string().uuid(),
            serviceTypeCode: z.string(),
            serviceTypeName: z.string(),
            bedsRequested: z.number(),
            expiresAt: z.string(),
            status: z.string(),
            createdAt: z.string(),
            notes: z.string().nullable(),
            client: z.object({
              id: z.string().uuid(),
              firstName: z.string(),
              lastName: z.string().nullable(),
              dateOfBirth: z.string().nullable(),
              sex: z.string().nullable(),
              race: z.string().nullable(),
              personallyIdentifiable: z.string().nullable(),
            }).nullable(),
          }),
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
          [StatusCodes.BAD_REQUEST]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const now = new Date();

      // Auto-expire holds that have passed their expiration time
      await autoExpireHolds(fastify.prisma, now);

      // Determine if this is a 3-character code or full UUID
      const isShortCode = id.length === 3;

      let hold;
      if (isShortCode) {
        // Search for holds where UUID starts with the 3-character code (case-insensitive)
        // Get all active holds and filter in JavaScript for case-insensitive matching
        const allActiveHolds = await fastify.prisma.bedHold.findMany({
          where: {
            status: {
              in: ['ACTIVE', 'EXTENDED'],
            },
            expiresAt: {
              gt: now,
            },
          },
          include: {
            facility: {
              select: {
                name: true,
              },
            },
            serviceType: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                sex: true,
                race: true,
                personallyIdentifiable: true,
              },
            },
          },
        });

        // Filter holds where the first 3 characters match (case-insensitive)
        const matchingHolds = allActiveHolds.filter(h =>
          h.id.substring(0, 3).toLowerCase() === id.toLowerCase()
        );

        if (matchingHolds.length === 0) {
          return reply.code(StatusCodes.NOT_FOUND).send({
            error: `No active hold found with ID code "${id.toUpperCase()}". Please check the hold ID and try again.`
          });
        }

        if (matchingHolds.length > 1) {
          return reply.code(StatusCodes.BAD_REQUEST).send({
            error: `Multiple holds found with ID code "${id.toUpperCase()}". Please use the full hold ID instead.`
          });
        }

        hold = matchingHolds[0];
      } else {
        // Full UUID lookup
        hold = await fastify.prisma.bedHold.findUnique({
          where: { id },
          include: {
            facility: {
              select: {
                name: true,
              },
            },
            serviceType: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                sex: true,
                race: true,
                personallyIdentifiable: true,
              },
            },
          },
        });

        if (!hold) {
          return reply.code(StatusCodes.NOT_FOUND).send({
            error: 'Hold not found. The hold ID may be incorrect or the hold may have been deleted.'
          });
        }
      }

      // Check if hold has expired
      if (hold.expiresAt < now) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: `Hold has expired. The hold expired on ${hold.expiresAt.toISOString()}. Expired holds cannot be used for check-in.`
        });
      }

      // Check if hold is in a valid state for check-in
      if (!['ACTIVE', 'EXTENDED'].includes(hold.status)) {
        const statusMessages = {
          EXPIRED: 'Hold has expired and cannot be used for check-in.',
          CANCELLED: 'Hold has been cancelled and cannot be used for check-in.',
          TRANSFERRED: 'Hold has already been transferred and cannot be used for check-in.',
        };
        const message = statusMessages[hold.status] || `Hold is in ${hold.status} status and cannot be used for check-in.`;
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: message });
      }

      return reply.send({
        id: hold.id,
        facilityId: hold.facilityId,
        facilityName: hold.facility.name,
        serviceTypeId: hold.serviceType.id,
        serviceTypeCode: hold.serviceType.code,
        serviceTypeName: hold.serviceType.name,
        bedsRequested: hold.bedsRequested,
        expiresAt: hold.expiresAt.toISOString(),
        status: hold.status,
        createdAt: hold.createdAt.toISOString(),
        notes: hold.notes,
        client: hold.client
          ? {
              id: hold.client.id,
              firstName: hold.client.firstName,
              lastName: hold.client.lastName,
              dateOfBirth: hold.client.dateOfBirth?.toISOString(),
              sex: hold.client.sex,
              race: hold.client.race,
              personallyIdentifiable: hold.client.personallyIdentifiable,
            }
          : null,
      });
    });
}
