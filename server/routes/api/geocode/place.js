import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import location from '#lib/location.js';
import { buildAddressLine1 } from '#lib/location.js';

export default async function (fastify, opts) {
  fastify.get('/place',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Get full place details including coordinates from AWS Location Service.',
        querystring: z.object({
          placeId: z.string().min(1),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            addressLine1: z.string(),
            city: z.string().nullable(),
            state: z.string().nullable(),
            postalCode: z.string().nullable(),
            latitude: z.number().nullable(),
            longitude: z.number().nullable(),
            neighborhood: z.string().nullable(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { placeId } = request.query;

      try {
        const response = await location.getPlace(placeId);
        const address = response.Address ?? {};
        const [longitude, latitude] = response.Position ?? [];

        return reply.send({
          addressLine1: buildAddressLine1(address),
          city: address.Locality ?? null,
          state: address.Region?.Code ?? null,
          postalCode: address.PostalCode ?? null,
          latitude: typeof latitude === 'number' ? latitude : null,
          longitude: typeof longitude === 'number' ? longitude : null,
          neighborhood: address.District ?? null,
        });
      } catch (error) {
        fastify.log.error(error, 'Error fetching place details');
        return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send();
      }
    });
}
