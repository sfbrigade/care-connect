import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Update a hold',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          notes: z.string().nullable().optional(),
          incidentId: z.string().uuid().nullable().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            id: z.string().uuid(),
            notes: z.string().nullable(),
            incidentId: z.string().uuid().nullable(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const { notes, incidentId } = request.body;

      // Find hold
      const hold = await fastify.prisma.bedHold.findUnique({
        where: { id },
      });

      if (!hold) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Hold not found' });
      }

      // Only the user who created the hold can update it
      if (hold.createdById !== request.user.id) {
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only update your own holds' });
      }

      // Validate incident if incidentId is provided
      if (incidentId !== null && incidentId !== undefined) {
        const incident = await fastify.prisma.incident.findUnique({
          where: { id: incidentId },
        });

        if (!incident) {
          return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Incident not found' });
        }

        // Verify incident belongs to current user
        if (incident.createdById !== request.user.id) {
          return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only link holds to your own incidents' });
        }
      }

      // Build update data
      const updateData = {};
      if (notes !== undefined) updateData.notes = notes;
      if (incidentId !== undefined) updateData.incidentId = incidentId;

      // Update hold
      const updated = await fastify.prisma.bedHold.update({
        where: { id },
        data: updateData,
      });

      return reply.send({
        id: updated.id,
        notes: updated.notes,
        incidentId: updated.incidentId,
      });
    });
}

