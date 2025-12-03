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
          [StatusCodes.CREATED]: z.array(z.object({
            id: z.string().uuid(),
            facilityId: z.string().uuid(),
            serviceTypeId: z.string().uuid(),
            bedsRequested: z.number(),
            expiresAt: z.string(),
            status: z.string(),
            createdAt: z.string(),
          })),
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
      if (service.serviceType.code !== 'LESC') {
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
      // availableBeds represents total capacity, so available = total - reserved - holds
      const totalBeds = service.availableBeds || 0;
      const reservedBeds = service.reservedBeds || 0;
      const availableBeds = Math.max(0, totalBeds - reservedBeds - currentHolds);

      if (bedsRequested > availableBeds) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'Insufficient beds available',
          availableBeds,
          requested: bedsRequested,
        });
      }

      // Create multiple holds (one per bed) with 30 minute expiration
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

      // Use a transaction to create all holds atomically
      const holds = await fastify.prisma.$transaction(
        Array.from({ length: bedsRequested }, () =>
          fastify.prisma.bedHold.create({
            data: {
              facilityId,
              serviceTypeId,
              bedsRequested: 1, // Each hold is for 1 bed
              expiresAt,
              status: 'ACTIVE',
              createdById: userId,
              notes: notes || null,
            },
          })
        )
      );

      // Note: Holds do NOT affect reservedBeds - they only reduce available beds
      // reservedBeds represents beds actually reserved for admissions, not temporary holds

      return reply.code(StatusCodes.CREATED).send(
        holds.map(hold => ({
          id: hold.id,
          facilityId: hold.facilityId,
          serviceTypeId: hold.serviceTypeId,
          bedsRequested: hold.bedsRequested,
          expiresAt: hold.expiresAt.toISOString(),
          status: hold.status,
          createdAt: hold.createdAt.toISOString(),
        }))
      );
    });
}
