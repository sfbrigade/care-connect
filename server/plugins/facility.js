import fp from 'fastify-plugin';
import { StatusCodes } from 'http-status-codes';

import Facility from '#models/facility.js';

export default fp(async function (fastify) {
  // add a facility object reference to the request instance
  fastify.decorateRequest('facility', null);
  // add a hook to check for a facility reference on every request
  fastify.addHook('onRequest', async (request) => {
    const { host = '' } = request.headers;
    const subdomain = host.split('.')[0];
    const data = await fastify.prisma.facility.findUnique({
      where: { subdomain },
      include: {
        bedTypes: true,
      },
    });
    if (data) {
      request.facility = new Facility(data);
    }
    // Stamp the user's current facility for SMS notification routing
    if (request.user && request.facility && request.user.currentFacilityId !== request.facility.id) {
      try {
        await fastify.prisma.user.update({
          where: { id: request.user.id },
          data: { currentFacilityId: request.facility.id },
        });
        request.user.currentFacilityId = request.facility.id;
      } catch (error) {
        // Best-effort: never fail the request over stamping. The next
        // authenticated request on this facility will retry.
        fastify.log.warn({ err: error, userId: request.user.id }, 'Failed to stamp currentFacilityId');
      }
    }
  });
  // onRequest handler to be used to ensure request is called on a facility subdomain
  fastify.decorate('requireFacility', async (request, reply) => {
    if (!request.facility) {
      return reply.code(StatusCodes.BAD_REQUEST).send();
    }
    if (!request.facility.isActive) {
      return reply.code(StatusCodes.FORBIDDEN).send();
    }
  });
});
