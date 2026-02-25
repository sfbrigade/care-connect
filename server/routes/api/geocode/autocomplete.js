import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const DATASF_URL = 'https://data.sfgov.org/resource/3mea-di5p.json';

function toTitleCase (str) {
  return str
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (ch) => ch.toUpperCase());
}

export default async function (fastify, opts) {
  fastify.get('/autocomplete',
    {
      schema: {
        description: 'Autocomplete address using DataSF address database.',
        querystring: z.object({
          text: z.string().min(1),
        }),
        response: {
          [StatusCodes.OK]: z.array(z.object({
            addressLine1: z.string(),
            city: z.string(),
            state: z.string(),
            postalCode: z.string().nullable(),
            latitude: z.number().nullable(),
            longitude: z.number().nullable(),
            neighborhood: z.string().nullable(),
          })),
        },
      },
    },
    async function (request, reply) {
      const { text } = request.query;

      try {
        const url = new URL(DATASF_URL);
        url.searchParams.set('$where', `starts_with(address, '${text.toUpperCase().replace(/'/g, "''")}')`);
        url.searchParams.set('$select', 'address, zip_code, latitude, longitude, nhood');
        url.searchParams.set('$order', 'address');
        url.searchParams.set('$limit', '5');

        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          const responseText = await response.text();
          fastify.log.error(`DataSF autocomplete request failed (${response.status}): ${responseText}`);
          return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send();
        }

        const data = await response.json();
        const results = data.map((row) => ({
          addressLine1: toTitleCase(row.address),
          city: 'San Francisco',
          state: 'CA',
          postalCode: row.zip_code ?? null,
          latitude: row.latitude ? parseFloat(row.latitude) : null,
          longitude: row.longitude ? parseFloat(row.longitude) : null,
          neighborhood: row.nhood ?? null,
        }));

        return reply.send(results);
      } catch (error) {
        fastify.log.error(error, 'Error during address autocomplete');
        return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send();
      }
    });
}
