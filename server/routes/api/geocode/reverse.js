import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

export default async function (fastify, opts) {
  fastify.get('/reverse',
    {
      preHandler: fastify.requireUser,
      schema: {
        description: 'Reverse geocode coordinates to address using OpenRouteService API.',
        querystring: z.object({
          latitude: z.string().transform((val) => {
            const num = parseFloat(val);
            if (isNaN(num)) {
              throw new Error('Invalid latitude');
            }
            return num;
          }),
          longitude: z.string().transform((val) => {
            const num = parseFloat(val);
            if (isNaN(num)) {
              throw new Error('Invalid longitude');
            }
            return num;
          }),
        }),
        response: {
          [StatusCodes.OK]: z.object({
            address: z.string().nullable(),
            error: z.string().optional(),
          }),
          [StatusCodes.BAD_REQUEST]: z.object({
            error: z.string(),
          }),
          [StatusCodes.INTERNAL_SERVER_ERROR]: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async function (request, reply) {
      const { latitude, longitude } = request.query;

      const API_KEY = process.env.OPENROUTESERVICE_API_KEY;
      if (!API_KEY) {
        fastify.log.warn('OPENROUTESERVICE_API_KEY not configured, skipping reverse geocoding');
        return reply.send({
          address: null,
          error: 'Geocoding service not configured',
        });
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
          return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
            address: null,
            error: 'Failed to reverse geocode coordinates',
          });
        }

        const data = await response.json();
        const feature = data?.features?.[0];

        if (!feature) {
          return reply.send({
            address: null,
            error: 'No address found for coordinates',
          });
        }

        // Extract formatted address from properties.label or construct from properties
        const address = feature.properties?.label
          || (feature.properties
            ? [
                feature.properties.name,
                feature.properties.street,
                feature.properties.locality,
                feature.properties.region,
                feature.properties.postalcode,
              ].filter(Boolean).join(', ')
            : null);

        return reply.send({
          address: address || null,
        });
      } catch (error) {
        fastify.log.error(error, 'Error during reverse geocoding');
        return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
          address: null,
          error: error.message || 'Failed to reverse geocode coordinates',
        });
      }
    });
}

