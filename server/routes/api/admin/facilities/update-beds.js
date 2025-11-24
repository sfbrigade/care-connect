import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.patch('/:id/beds',
    {
      schema: {
        description: 'Update bed availability for a service type (admin only).',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          serviceTypeId: z.string().uuid(),
          availableBeds: z.number().int().min(0).optional(),
          reservedBeds: z.number().int().min(0).optional(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            facilityId: z.string().uuid(),
            serviceTypeId: z.string().uuid(),
            availableBeds: z.number().nullable(),
            reservedBeds: z.number().nullable(),
          }),
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
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility not found' });
      }

      // Verify service type exists
      const serviceType = await fastify.prisma.serviceType.findUnique({
        where: { id: serviceTypeId },
      });

      if (!serviceType) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Service type not found' });
      }

      // Get or create FacilityService
      let facilityService = await fastify.prisma.facilityService.findUnique({
        where: {
          facilityId_serviceTypeId: {
            facilityId,
            serviceTypeId,
          },
        },
      });

      const updateData = {};
      if (availableBeds !== undefined) updateData.availableBeds = availableBeds;
      if (reservedBeds !== undefined) updateData.reservedBeds = reservedBeds;

      if (!facilityService) {
        // Create new FacilityService
        facilityService = await fastify.prisma.facilityService.create({
          data: {
            facilityId,
            serviceTypeId,
            availableBeds: availableBeds ?? 0,
            reservedBeds: reservedBeds ?? 0,
          },
        });
      } else {
        // Update existing FacilityService
        facilityService = await fastify.prisma.facilityService.update({
          where: {
            facilityId_serviceTypeId: {
              facilityId,
              serviceTypeId,
            },
          },
          data: updateData,
        });
      }

      return reply.send({
        facilityId: facilityService.facilityId,
        serviceTypeId: facilityService.serviceTypeId,
        availableBeds: facilityService.availableBeds ?? null,
        reservedBeds: facilityService.reservedBeds ?? null,
      });
    });
}
