import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import location from '#lib/location.js';

export default async function (fastify, opts) {
  fastify.get('/search',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Search for addresses using AWS Location Service.',
        querystring: z.object({
          text: z.string().min(1),
        }),
        response: {
          [StatusCodes.OK]: z.array(z.object({
            placeId: z.string(),
            label: z.string(),
            addressLine1: z.string(),
            city: z.string().nullable(),
            state: z.string().nullable(),
            postalCode: z.string().nullable(),
            neighborhood: z.string().nullable(),
            latitude: z.number().nullable(),
            longitude: z.number().nullable(),
          })),
        },
      },
    },
    async function (request, reply) {
      const { text } = request.query;

      try {
        const response = await location.suggest(text);
        const results = (response.ResultItems ?? [])
          .filter((item) => item.SuggestResultItemType === 'Place' && item.Place)
          .map((item) => {
            const address = item.Place.Address ?? {};
            const [longitude, latitude] = item.Place.Position ?? [];
            return {
              placeId: item.Place.PlaceId,
              label: address.Label ?? item.Title,
              addressLine1: location.buildAddressLine1(address),
              city: address.Locality ?? null,
              state: address.Region?.Code ?? null,
              postalCode: address.PostalCode ?? null,
              neighborhood: address.District ?? null,
              latitude: typeof latitude === 'number' ? latitude : null,
              longitude: typeof longitude === 'number' ? longitude : null,
            };
          });

        return reply.send(results);
      } catch (error) {
        fastify.log.error(error, 'Error during address search');
        return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send();
      }
    });
}
