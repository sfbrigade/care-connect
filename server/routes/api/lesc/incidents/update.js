import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Update an incident',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          cadNumber: z.string().optional(),
          locationArrested: z.string().nullable().optional(),
          dateTimeArrested: z.string().datetime().optional(),
          charge: z.string().optional(),
          unit: z.string().nullable().optional(),
          agency: z.string().nullable().optional(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            id: z.string().uuid(),
            cadNumber: z.string(),
            locationArrested: z.string().nullable(),
            dateTimeArrested: z.string(),
            charge: z.string(),
            unit: z.string().nullable(),
            badgeNumber: z.string().nullable(),
            agency: z.string().nullable(),
            createdById: z.string().uuid(),
            createdAt: z.string(),
            updatedAt: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const {
        cadNumber,
        locationArrested,
        dateTimeArrested,
        charge,
        unit,
        agency,
      } = request.body;

      // Find incident
      const incident = await fastify.prisma.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Incident not found' });
      }

      // Only the user who created the incident can update it
      if (incident.createdById !== request.user.id) {
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only update your own incidents' });
      }

      // Build update data
      const updateData = {};
      if (cadNumber !== undefined) updateData.cadNumber = cadNumber;
      if (locationArrested !== undefined) updateData.locationArrested = locationArrested;
      if (dateTimeArrested !== undefined) updateData.dateTimeArrested = new Date(dateTimeArrested);
      if (charge !== undefined) updateData.charge = charge;
      if (unit !== undefined) updateData.unit = unit;
      if (agency !== undefined) updateData.agency = agency;

      // Update incident
      const updated = await fastify.prisma.incident.update({
        where: { id },
        data: updateData,
      });

      return reply.send({
        id: updated.id,
        cadNumber: updated.cadNumber,
        locationArrested: updated.locationArrested,
        dateTimeArrested: updated.dateTimeArrested.toISOString(),
        charge: updated.charge,
        unit: updated.unit,
        badgeNumber: updated.badgeNumber,
        agency: updated.agency,
        createdById: updated.createdById,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    });
}

