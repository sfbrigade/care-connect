import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { autoExpireHolds } from '#lib/lesc/holds.js';

export default async function (fastify, opts) {
  fastify.get('/:id/holds',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List all active holds for a facility (admin only, shows all holds regardless of creator).',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.array(z.object({
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
            incident: z.object({
              id: z.string().uuid(),
              cadNumber: z.string(),
              locationArrested: z.string().nullable(),
              dateTimeArrested: z.string(),
              charge: z.string(),
              unit: z.string().nullable(),
              badgeNumber: z.string().nullable(),
              agency: z.string().nullable(),
            }).nullable(),
          })),
        },
      },
    },
    async function (request, reply) {
      const { id: facilityId } = request.params;
      const now = new Date();

      // Auto-expire holds that have passed their expiration time
      await autoExpireHolds(fastify.prisma, now);

      // Note: No filter by createdById - admin can see all holds for the facility
      const holds = await fastify.prisma.bedHold.findMany({
        where: {
          facilityId,
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
          incident: {
            select: {
              id: true,
              cadNumber: true,
              locationArrested: true,
              dateTimeArrested: true,
              charge: true,
              unit: true,
              badgeNumber: true,
              agency: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send(holds.map(hold => ({
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
        createdBy: hold.createdBy
          ? {
              id: hold.createdBy.id,
              firstName: hold.createdBy.firstName,
              lastName: hold.createdBy.lastName,
              badgeNumber: hold.createdBy.badgeNumber,
              rank: hold.createdBy.rank,
            }
          : null,
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
        incident: hold.incident
          ? {
              id: hold.incident.id,
              cadNumber: hold.incident.cadNumber,
              locationArrested: hold.incident.locationArrested,
              dateTimeArrested: hold.incident.dateTimeArrested.toISOString(),
              charge: hold.incident.charge,
              unit: hold.incident.unit,
              badgeNumber: hold.incident.badgeNumber,
              agency: hold.incident.agency,
            }
          : null,
      })));
    });
}
