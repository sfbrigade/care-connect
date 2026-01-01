import { StatusCodes } from 'http-status-codes';
import BedHold from '#models/bedHold.js';

export default async function (fastify, opts) {
  fastify.post('/',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Create a bed hold with 60 minute default expiration.',
        body: BedHold.CreateSchema,
        response: {
          [StatusCodes.CREATED]: BedHold.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { facilityId, incidentId, notes } = request.body;
      const userId = request.user.id;

      // Validate incident if incidentId is provided
      if (incidentId) {
        const incident = await fastify.prisma.incident.findUnique({
          where: { id: incidentId },
        });

        if (!incident) {
          return reply.code(StatusCodes.BAD_REQUEST).send({ error: 'Incident not found' });
        }

        // Verify incident belongs to current user
        if (incident.createdById !== userId) {
          return reply.code(StatusCodes.FORBIDDEN).send({ error: 'You can only create holds linked to your own incidents' });
        }
      }

      // Verify facility exists
      const facility = await fastify.prisma.facility.findUnique({
        where: { id: facilityId },
        include: {
          services: {
            include: {
              serviceType: true,
            },
          },
        },
      });

      if (!facility) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Facility not found' });
      }

      // TODO: make service type selection explicit
      const service = facility.services[0];
      if (!service) {
        return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Service type not found for this facility' });
      }
      const serviceTypeId = service.serviceTypeId;

      // TODO: needs optimistic locking to avoid race conditions

      // Check current availability
      const now = new Date();
      const activeHolds = await fastify.prisma.bedHold.aggregate({
        where: {
          facilityId,
          serviceTypeId,
          status: {
            in: ['ACTIVE', 'EXTENDED'],
          },
          expiresAt: {
            gt: now,
          },
        },
        _sum: {
          bedsRequested: true,
        },
      });

      const currentHolds = activeHolds._sum.bedsRequested || 0;
      // availableBeds represents total capacity, so available = total - reserved - holds
      const totalBeds = service.availableBeds || 0;
      const reservedBeds = service.reservedBeds || 0;
      const availableBeds = Math.max(0, totalBeds - reservedBeds - currentHolds);

      if (availableBeds <= 0) {
        return reply.code(StatusCodes.BAD_REQUEST).send({
          error: 'Insufficient beds available',
          availableBeds,
        });
      }

      // Create a hold with 60 minute expiration
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

      const hold = await fastify.prisma.bedHold.create({
        data: {
          facilityId,
          serviceTypeId,
          bedsRequested: 1, // Each hold is for 1 bed
          expiresAt,
          status: 'ACTIVE',
          createdById: userId,
          notes: notes || null,
          incidentId: incidentId || null,
        },
      });

      return reply.code(StatusCodes.CREATED).send(hold);
    });
}
