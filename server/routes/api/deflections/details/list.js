import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionDetail from "#models/deflectionDetail.js"

export default async function (fastify, opts) {
    fastify.get('/',
        {
            onRequest: fastify.requireUser,
            schema: {
                description: 'Returns a list of deflection details categories.',
                response: {
                    [StatusCodes.OK]: z.array(DeflectionDetail.ResponseSchema),
                },
            },
        },
        async function (request, reply) {
            const records = await fastify.prisma.DeflectionDetail.findMany({
                orderBy: { name: 'asc' },
            });
            console.log("called");
            return reply.send(records);
        });
}
