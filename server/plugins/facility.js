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
    const data = await fastify.prisma.facility.findUnique({ where: { subdomain } });
    request.facility = new Facility(data);
  });
  // onRequest handler to be used to ensure a user is logged in
  fastify.decorate('requireFacility', (request, reply) => {
    if (!request.facility) {
      return reply.code(StatusCodes.BAD_REQUEST).send();
    }
    if (!request.facility.isActive) {
      return reply.code(StatusCodes.FORBIDDEN).send();
    }
  });
});
