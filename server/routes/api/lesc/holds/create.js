import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      schema: {
        description: 'Create a bed hold with 30 minute default expiration.',
        body: z.object({
          facilityId: z.string().uuid(),
          serviceTypeId: z.string().uuid(),
          bedsRequested: z.number().int().positive(),
          notes: z.string().optional(),
        }),
        response: {
          [StatusCodes.CREATED]: z.object({
            id: z.string().uuid(),
            facilityId: z.string().uuid(),
            serviceTypeId: z.string().uuid(),
            bedsRequested: z.number(),
            expiresAt: z.string(),
            status: z.string(),
            createdAt: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { facilityId, serviceTypeId, bedsRequested, notes } = request.body;
      const userId = request.user?.id || null;

      // Verify facility and service type exist and are LESC
      const facility = await fastify.prisma.facility.findUnique({
        where: { id: facilityId },
        include: {
          services: {
            where: { serviceTypeId },
            include: {
              serviceType: true,
            },
          },
        },
      });

      if (!facility) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility not found' });
      }

      const service = facility.services[0];
      if (!service) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Service type not found for this facility' });
      }

      // Verify it's a LESC service type
      if (!['LESC', 'SOBERING'].includes(service.serviceType.code)) {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Service type is not a LESC service' });
      }

      // Check current availability
      const now = new Date();
      const activeHolds = await fastify.prisma.bedHold.aggregate({
        where: {
          facilityId,
          serviceTypeId,
          status: {
            in: ['ACTIVE', 'EXTENDED'],
          },
          expiresAt: {
            gt: now,
          },
        },
        _sum: {
          bedsRequested: true,
        },
      });

      const currentHolds = activeHolds._sum.bedsRequested || 0;
      const availableBeds = (service.availableBeds || 0) - currentHolds;

      if (bedsRequested > availableBeds) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'Insufficient beds available',
          availableBeds,
          requested: bedsRequested,
        });
      }

      // Create hold with 30 minute expiration
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

      const hold = await fastify.prisma.bedHold.create({
        data: {
          facilityId,
          serviceTypeId,
          bedsRequested,
          expiresAt,
          status: 'ACTIVE',
          createdById: userId,
          notes: notes || null,
        },
      });

      // Update FacilityService reservedBeds
      await fastify.prisma.facilityService.update({
        where: {
          facilityId_serviceTypeId: {
            facilityId,
            serviceTypeId,
          },
        },
        data: {
          reservedBeds: {
            increment: bedsRequested,
          },
        },
      });

      return reply.code(StatusCodes.CREATED).send({
        id: hold.id,
        facilityId: hold.facilityId,
        serviceTypeId: hold.serviceTypeId,
        bedsRequested: hold.bedsRequested,
        expiresAt: hold.expiresAt.toISOString(),
        status: hold.status,
        createdAt: hold.createdAt.toISOString(),
      });
    });
}

