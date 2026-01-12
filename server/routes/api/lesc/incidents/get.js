import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/:id',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Get incident by ID with related holds',
        params: z.object({
          id: z.string().uuid(),
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
            bedHolds: z.array(z.object({
              id: z.string().uuid(),
              facilityId: z.string().uuid(),
              serviceTypeId: z.string(),
              bedsRequested: z.number(),
              expiresAt: z.string(),
              status: z.string(),
              createdAt: z.string(),
            })),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;

      const incident = await fastify.prisma.incident.findUnique({
        where: { id },
        include: {
          bedHolds: {
            select: {
              id: true,
              facilityId: true,
              serviceTypeId: true,
              bedsRequested: true,
              expiresAt: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      if (!incident) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Incident not found' });
      }

      // Only the user who created the incident can view it
      if (incident.createdById !== request.user.id) {
        return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only view your own incidents' });
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
        bedHolds: incident.bedHolds.map(hold => ({
          id: hold.id,
          facilityId: hold.facilityId,
          serviceTypeId: hold.serviceTypeId,
          bedsRequested: hold.bedsRequested,
          expiresAt: hold.expiresAt.toISOString(),
          status: hold.status,
          createdAt: hold.createdAt.toISOString(),
        })),
      });
    });
}
