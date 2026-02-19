import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/reverse',
    {
      // onRequest: fastify.requireUser,
      schema: {
        description: 'Reverse geocode coordinates to address using OpenRouteService API.',
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

      const API_KEY = process.env.OPENROUTESERVICE_API_KEY;
      if (!API_KEY) {
        fastify.log.warn('OPENROUTESERVICE_API_KEY not configured, skipping reverse geocoding');
        return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send();
      }

      const BASE_URL = process.env.OPENROUTESERVICE_BASE_URL ?? 'https://api.openrouteservice.org/geocode/search';
      const REVERSE_URL = BASE_URL.replace('/geocode/search', '/geocode/reverse');

      try {
        const url = new URL(REVERSE_URL);
        url.searchParams.set('point.lon', longitude.toString());
        url.searchParams.set('point.lat', latitude.toString());

        if (BASE_URL.includes('openrouteservice.org')) {
          url.searchParams.set('api_key', API_KEY);
        }

        const headers = {
          Accept: 'application/json',
        };
        if (!BASE_URL.includes('openrouteservice.org')) {
          headers.Authorization = API_KEY;
        }

        const response = await fetch(url, {
          headers,
        });

        if (!response.ok) {
          const text = await response.text();
          fastify.log.error(`Reverse geocode request failed (${response.status}): ${text}`);
          return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send();
        }

        const data = await response.json();
        let result;
        for (const feature of (data?.features ?? [])) {
          const street = feature.properties?.street;
          const houseNumber = feature.properties?.housenumber;
          const streetAddress = street ? [houseNumber, street].filter(Boolean).join(' ') : null;
          result = {
            addressLine1: streetAddress ?? feature.properties?.label ?? null,
            city: feature.properties?.locality ?? null,
            state: feature.properties?.region_a ?? null,
            postalCode: feature.properties?.postalcode ?? null,
          };
          if (streetAddress) {
            break;
          }
        }

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
