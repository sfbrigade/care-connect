import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import location from '#lib/location.js';

export default async function (fastify, opts) {
  fastify.get('/reverse',
    {
      // onRequest: fastify.requireUser,
      schema: {
        description: 'Reverse geocode coordinates to address using AWS GeoPlaces.',
        querystring: z.object({
          latitude: z.coerce.number(),
          longitude: z.coerce.number(),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            addressLine1: z.string().nullable(),
            city: z.string().nullable(),
            state: z.string().nullable(),
            postalCode: z.string().nullable(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { latitude, longitude } = request.query;

      try {
        const result = await location.reverseGeocode(latitude, longitude);
        if (!result) {
          return reply.code(StatusCodes.NOT_FOUND).send();
        }
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error, 'Error during reverse geocoding');
        return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send();
      }
    });
}
