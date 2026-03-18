import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionDetail from "#models/deflectionDetail.js"

export default async function (fastify, opts) {
    fastify.get('/:id',
        {
            onRequest: fastify.requireUser,
            schema: {
                description: 'Get a deflection detail by ID.',
                params: z.object({
                    id: z.string(),
                }),
                response: {
                    [StatusCodes.OK]: DeflectionDetail.ResponseSchema,
                    [StatusCodes.NOT_FOUND]: z.object({
                        error: z.string(),
                    }),
                },
            }
        },
        async function (request, reply) {
            const { id } = request.params;

            const record = await fastify.prisma.DeflectionDetail.findUnique({
                where: { id },
            });
            console.log(record);
            if (!record) {
                return reply.code(StatusCodes.NOT_FOUND).send({ error: 'Deflection detail not found' });
            }

            return reply.send(record);
        });
}
