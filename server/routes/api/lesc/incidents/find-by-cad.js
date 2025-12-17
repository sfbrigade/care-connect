import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/by-cad/:cadNumber',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Find incident by CAD number for current user',
        params: z.object({
          cadNumber: z.string().min(1),
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
          }).nullable(),
          [StatusCodes.NOT_FOUND]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { cadNumber } = request.params;
      const userId = request.user.id;

      const incident = await fastify.prisma.incident.findFirst({
        where: {
          cadNumber: cadNumber.trim(),
          createdById: userId,
        },
        orderBy: {
          createdAt: 'desc', // Get most recent if multiple exist
        },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Incident not found' });
      }

      return reply.send({
        id: incident.id,
        cadNumber: incident.cadNumber,
        locationArrested: incident.locationArrested,
        dateTimeArrested: incident.dateTimeArrested.toISOString(),
        charge: incident.charge,
        unit: incident.unit,
        badgeNumber: incident.badgeNumber,
        agency: incident.agency,
        createdById: incident.createdById,
        createdAt: incident.createdAt.toISOString(),
        updatedAt: incident.updatedAt.toISOString(),
      });
    });
}
