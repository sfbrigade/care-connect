import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import intersections from '#lib/intersections.js';

const IntersectionResultSchema = z.object({
  cnn: z.string(),
  street1: z.string(),
  street2: z.string(),
  street1Display: z.string(),
  street2Display: z.string(),
  label: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  zipCode: z.string().nullable(),
});

const NearestResultSchema = IntersectionResultSchema.extend({
  distanceMeters: z.number(),
});

export default async function (fastify, opts) {
  fastify.get('/intersections',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Search SF intersection index by free-text cross-street query.',
        querystring: z.object({
          text: z.string().min(1),
          limit: z.coerce.number().int().min(1).max(20).optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(IntersectionResultSchema),
        },
      },
    },
    async function (request, reply) {
      const { text, limit } = request.query;
      try {
        const results = intersections.search(text, { limit: limit ?? 10 });
        return reply.send(results);
      } catch (error) {
        fastify.log.error(error, 'Error during intersection search');
        return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send();
      }
    });

  fastify.get('/intersections/nearest',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Find the N intersections nearest to a given lat/lng (for "between" context).',
        querystring: z.object({
          latitude: z.coerce.number(),
          longitude: z.coerce.number(),
          n: z.coerce.number().int().min(1).max(10).optional(),
        }),
        response: {
          [StatusCodes.OK]: z.array(NearestResultSchema),
        },
      },
    },
    async function (request, reply) {
      const { latitude, longitude, n } = request.query;
      try {
        const results = intersections.findNearest(latitude, longitude, { n: n ?? 2 });
        return reply.send(results);
      } catch (error) {
        fastify.log.error(error, 'Error during nearest intersection lookup');
        return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send();
      }
    });
}
