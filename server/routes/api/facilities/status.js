import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Facility from '#models/facility.js';
import FacilityUpdate from '#models/facilityUpdate.js';

export default async function (fastify, opts) {
  fastify.post('/:id/status',
    {
      onRequest: fastify.requireAdmin,
      schema: {
        description: 'Update a facility\'s status (admin only).',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: FacilityUpdate.CreateSchema,
        response: {
          [StatusCodes.OK]: Facility.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;

      let facility = await fastify.prisma.facility.findUnique({
        where: { id },
      });

      if (!facility) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility not found' });
      }

      if (data.status === Facility.Status.OPEN_ACCEPTING) {
        data.statusReasonId = null;
        data.statusOther = null;
      } else {
        const statusReason = await fastify.prisma.facilityStatusReason.findUnique({
          where: { id: data.statusReasonId },
        });
        if (!statusReason) {
          return reply.status(StatusCodes.UNPROCESSABLE_ENTITY).send({
            statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
            errors: [{ path: 'statusReasonId', message: 'Status reason not found' }],
          });
        }
      }
      if (data.updateNotes === '') {
        data.updateNotes = null;
      }

      await fastify.prisma.$transaction(async (tx) => {
        const update = await tx.facilityUpdate.create({
          data: {
            ...data,
            facilityId: id,
            updateMethod: Facility.UpdateMethod.MANUAL,
            updatedById: request.user.id,
          },
        });
        delete update.id;
        delete update.facilityId;
        facility = await tx.facility.update({
          where: { id },
          data: update,
        });
      });

      return reply.send(facility);
    });
}
