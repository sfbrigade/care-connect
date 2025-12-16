import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '#lib/lesc/holds.js';

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
              middleInitial: z.string().nullable(),
              dateOfBirth: z.string().nullable(),
              sex: z.string().nullable(),
              race: z.string().nullable(),
              address: z.string().nullable(),
              driverLicense: z.string().nullable(),
              localId: z.string().nullable(),
              personallyIdentifiable: z.string().nullable(),
            }).nullable(),
            createdBy: z.object({
              id: z.string().uuid(),
              firstName: z.string(),
              lastName: z.string(),
              badgeNumber: z.string().nullable(),
              rank: z.string().nullable(),
            }).nullable(),
          }),
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
            holdId: z.string().optional(),
            foundHolds: z.number().optional(),
          }),
          [StatusCodes.BAD_REQUEST]: z.object({
            error: z.string(),
            holdId: z.string().optional(),
            status: z.string().optional(),
            expiresAt: z.string().optional(),
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
                middleInitial: true,
                dateOfBirth: true,
                sex: true,
                race: true,
                address: true,
                driverLicense: true,
                localId: true,
                personallyIdentifiable: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                badgeNumber: true,
                rank: true,
              },
            },
          },
        });

        // Filter holds where the first 3 characters match (case-insensitive)
        const matchingHolds = allActiveHolds.filter(h =>
          h.id.substring(0, 3).toLowerCase() === id.toLowerCase()
        );

        if (matchingHolds.length === 0) {
          // Check if any holds exist with this prefix but are expired/cancelled/etc.
          // Note: Prisma doesn't support startsWith on UUID fields, so we fetch recent holds
          // and filter in JavaScript (only for 3-char codes)
          let allHoldsWithPrefix = [];
          try {
            // Fetch recent holds and filter by prefix in JavaScript
            const recentHolds = await fastify.prisma.bedHold.findMany({
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                },
              },
              select: {
                id: true,
                status: true,
                expiresAt: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 100, // Limit to recent holds for performance
            });

            // Filter holds where UUID starts with the 3-character code (case-insensitive)
            allHoldsWithPrefix = recentHolds.filter(h =>
              h.id.substring(0, 3).toLowerCase() === id.toLowerCase()
            );
          } catch (error) {
            // If query fails, just return simple 404
            fastify.log.warn(error, 'Error checking for holds with prefix');
          }

          if (allHoldsWithPrefix.length > 0) {
            // Found holds but they're not active
            const expiredHolds = allHoldsWithPrefix.filter(h => h.expiresAt < now || h.status === 'EXPIRED');
            const cancelledHolds = allHoldsWithPrefix.filter(h => h.status === 'CANCELLED');
            const transferredHolds = allHoldsWithPrefix.filter(h => h.status === 'TRANSFERRED');

            const details = [];
            if (expiredHolds.length > 0) {
              const latestExpired = expiredHolds[0];
              const expiredDate = latestExpired.expiresAt.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              details.push(`expired on ${expiredDate}`);
            }
            if (cancelledHolds.length > 0) {
              details.push('cancelled');
            }
            if (transferredHolds.length > 0) {
              details.push('transferred');
            }

            const detailText = details.length > 0 ? ` Found ${allHoldsWithPrefix.length} hold(s) with this code, but ${details.join(' or ')}.` : '';

            return reply.code(StatusCodes.NOT_FOUND).send({
              error: `No active hold found with ID code "${id.toUpperCase()}".${detailText} Please check the hold ID or request a new hold.`,
              holdId: id,
              foundHolds: allHoldsWithPrefix.length,
            });
          }

          return reply.code(StatusCodes.NOT_FOUND).send({
            error: `No active hold found with ID code "${id.toUpperCase()}". Please check the hold ID or request a new hold.`,
            holdId: id,
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
                middleInitial: true,
                dateOfBirth: true,
                sex: true,
                race: true,
                address: true,
                driverLicense: true,
                localId: true,
                personallyIdentifiable: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                badgeNumber: true,
                rank: true,
              },
            },
          },
        });

        if (!hold) {
          // For full UUID, check if a hold with this ID exists but is expired/cancelled/etc.
          const existingHold = await fastify.prisma.bedHold.findUnique({
            where: { id },
            select: {
              id: true,
              status: true,
              expiresAt: true,
              createdAt: true,
            },
          });

          if (existingHold) {
            // Hold exists but is not in a usable state
            const expiredDate = existingHold.expiresAt.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            if (existingHold.status === 'EXPIRED' || existingHold.expiresAt < now) {
              return reply.code(StatusCodes.BAD_REQUEST).send({
                error: `Hold ${id.substring(0, 8).toUpperCase()}... (${id}) has expired. It expired on ${expiredDate}. Expired holds cannot be used for check-in. Please request a new hold.`,
                holdId: id,
                status: existingHold.status,
                expiresAt: existingHold.expiresAt.toISOString(),
              });
            }

            if (existingHold.status === 'CANCELLED') {
              return reply.code(StatusCodes.BAD_REQUEST).send({
                error: `Hold ${id.substring(0, 8).toUpperCase()}... (${id}) has been cancelled and cannot be used for check-in. Please request a new hold.`,
                holdId: id,
                status: existingHold.status,
              });
            }

            if (existingHold.status === 'TRANSFERRED') {
              return reply.code(StatusCodes.BAD_REQUEST).send({
                error: `Hold ${id.substring(0, 8).toUpperCase()}... (${id}) has already been transferred and cannot be used for check-in again.`,
                holdId: id,
                status: existingHold.status,
              });
            }

            return reply.code(StatusCodes.BAD_REQUEST).send({
              error: `Hold ${id.substring(0, 8).toUpperCase()}... (${id}) is in "${existingHold.status}" status and cannot be used for check-in.`,
              holdId: id,
              status: existingHold.status,
            });
          }

          return reply.code(StatusCodes.NOT_FOUND).send({
            error: `Hold not found. The hold ID "${id.substring(0, 8).toUpperCase()}..." (${id}) may be incorrect, or the hold may have been deleted. Please verify the hold ID and try again.`,
            holdId: id,
          });
        }
      }

      // Check if hold has expired
      if (hold.expiresAt < now) {
        const expiredDate = hold.expiresAt.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: `Hold ${hold.id.substring(0, 8).toUpperCase()}... (${hold.id}) has expired. It expired on ${expiredDate}. Expired holds cannot be used for check-in. Please request a new hold.`,
          holdId: hold.id,
          status: hold.status,
          expiresAt: hold.expiresAt.toISOString(),
        });
      }

      // Check if hold is in a valid state for check-in
      if (!['ACTIVE', 'EXTENDED'].includes(hold.status)) {
        const holdIdShort = hold.id.substring(0, 8).toUpperCase();
        const statusMessages = {
          EXPIRED: `Hold ${holdIdShort}... (${hold.id}) has expired and cannot be used for check-in. Please request a new hold.`,
          CANCELLED: `Hold ${holdIdShort}... (${hold.id}) has been cancelled and cannot be used for check-in. Please request a new hold.`,
          TRANSFERRED: `Hold ${holdIdShort}... (${hold.id}) has already been transferred and cannot be used for check-in again.`,
        };
        const message = statusMessages[hold.status] || `Hold ${holdIdShort}... (${hold.id}) is in "${hold.status}" status and cannot be used for check-in.`;
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: message,
          holdId: hold.id,
          status: hold.status,
        });
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
              middleInitial: hold.client.middleInitial,
              dateOfBirth: hold.client.dateOfBirth?.toISOString() ?? null,
              sex: hold.client.sex,
              race: hold.client.race,
              address: hold.client.address,
              driverLicense: hold.client.driverLicense,
              localId: hold.client.localId,
              personallyIdentifiable: hold.client.personallyIdentifiable,
            }
          : null,
        createdBy: hold.createdBy
          ? {
              id: hold.createdBy.id,
              firstName: hold.createdBy.firstName,
              lastName: hold.createdBy.lastName,
              badgeNumber: hold.createdBy.badgeNumber,
              rank: hold.createdBy.rank,
            }
          : null,
      });
    });
}
