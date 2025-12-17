import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'List incidents for current user, ordered by creation date (newest first).',
        response: {
          [StatusCodes.OK]: z.array(z.object({
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
            holdCount: z.number(),
          })),
        },
      },
    },
    async function (request, reply) {
      const incidents = await fastify.prisma.incident.findMany({
        where: {
          createdById: request.user.id,
        },
        include: {
          _count: {
            select: {
              bedHolds: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send(
        incidents.map(incident => ({
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
          holdCount: incident._count.bedHolds,
        }))
      );
    });
}
