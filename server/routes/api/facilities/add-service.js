import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.post('/:id/services',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Add a service type to a facility (admin only).',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          serviceTypeId: z.string().uuid(),
          availableBeds: z.number().int().min(0).default(0),
          reservedBeds: z.number().int().min(0).default(0),
        }),
        response: {
          [StatusCodes.CREATED]: z.object({
            facilityId: z.string().uuid(),
            serviceTypeId: z.string().uuid(),
            availableBeds: z.number(),
            reservedBeds: z.number(),
          }),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id: facilityId } = request.params;
      const { serviceTypeId, availableBeds, reservedBeds } = request.body;

      // Verify facility exists
      const facility = await fastify.prisma.facility.findUnique({
        where: { id: facilityId },
      });

      if (!facility) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      // Verify service type exists
      const serviceType = await fastify.prisma.serviceType.findUnique({
        where: { id: serviceTypeId },
      });

      if (!serviceType) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      // Create or update the facility service
      const facilityService = await fastify.prisma.facilityService.upsert({
        where: {
          facilityId_serviceTypeId: {
            facilityId,
            serviceTypeId,
          },
        },
        update: {
          availableBeds,
          reservedBeds,
        },
        create: {
          facilityId,
          serviceTypeId,
          availableBeds,
          reservedBeds,
        },
      });

      return reply.code(StatusCodes.CREATED).send({
        facilityId: facilityService.facilityId,
        serviceTypeId: facilityService.serviceTypeId,
        availableBeds: facilityService.availableBeds,
        reservedBeds: facilityService.reservedBeds,
      });
    });
}
