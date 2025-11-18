import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.delete('/:id',
    {
      schema: {
        description: 'Cancel a bed hold.',
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            id: z.string().uuid(),
            status: z.string(),
            cancelledAt: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const userId = request.user?.id || null;

      const hold = await fastify.prisma.bedHold.findUnique({
        where: { id },
      });

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      if (hold.status === 'CANCELLED') {
        return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Hold is already cancelled' });
      }

      const now = new Date();

      // Update hold status
      const updated = await fastify.prisma.bedHold.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledById: userId,
        },
      });

      // Update FacilityService reservedBeds
      await fastify.prisma.facilityService.update({
        where: {
          facilityId_serviceTypeId: {
            facilityId: hold.facilityId,
            serviceTypeId: hold.serviceTypeId,
          },
        },
        data: {
          reservedBeds: {
            decrement: hold.bedsRequested,
          },
        },
      });

      return reply.send({
        id: updated.id,
        status: updated.status,
        cancelledAt: updated.cancelledAt.toISOString(),
      });
    });
}

