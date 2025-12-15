import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Create an incident with shared fields for grouping holds.',
        body: z.object({
          cadNumber: z.string().min(1, 'CAD number is required'),
          locationArrested: z.string().optional(),
          dateTimeArrested: z.string().datetime().optional(),
          charge: z.string().optional().default('647(f) RWS'),
          unit: z.string().optional(),
          badgeNumber: z.string().optional(),
          agency: z.string().optional(),
        }),
        response: {
          [StatusCodes.CREATED]: z.object({
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
      const {
        cadNumber,
        locationArrested,
        dateTimeArrested,
        charge,
        unit,
        badgeNumber,
        agency,
      } = request.body;
      const userId = request.user.id;

      // Parse dateTimeArrested or default to now
      const arrestDateTime = dateTimeArrested ? new Date(dateTimeArrested) : new Date();

      // Create incident
      const incident = await fastify.prisma.incident.create({
        data: {
          cadNumber,
          locationArrested: locationArrested || null,
          dateTimeArrested: arrestDateTime,
          charge: charge || '647(f) RWS',
          unit: unit || null,
          badgeNumber: badgeNumber || null,
          agency: agency || null,
          createdById: userId,
        },
      });

      return reply.code(StatusCodes.CREATED).send({
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
