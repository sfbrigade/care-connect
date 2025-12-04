import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id/services/:serviceTypeId',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Remove a service type from a facility (admin only).',
        params: z.object({
          id: z.string().uuid(),
          serviceTypeId: z.string().uuid(),
        }),
        response: {
          [StatusCodes.NO_CONTENT]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
    },
    async function (request, reply) {
      const { id: facilityId, serviceTypeId } = request.params;

      const facilityService = await fastify.prisma.facilityService.findUnique({
        where: {
          facilityId_serviceTypeId: {
            facilityId,
            serviceTypeId,
          },
        },
      });

      if (!facilityService) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      await fastify.prisma.facilityService.delete({
        where: {
          facilityId_serviceTypeId: {
            facilityId,
            serviceTypeId,
          },
        },
      });

      return reply.code(StatusCodes.NO_CONTENT).send();
    });
}
