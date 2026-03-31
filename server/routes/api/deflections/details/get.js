import {StatusCodes} from 'http-status-codes';
import {z} from 'zod';

import DeflectionDetail from '#models/deflectionDetail.js';

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
                    [StatusCodes.OK]: DeflectionDetail.ResponseSchema.extend({
                        deflectionDetailCategoryName: z.string().nullable(),
                    }),
                    [StatusCodes.NOT_FOUND]: z.object({
                        error: z.string(),
                    }),
                },
            }
        },
        async function (request, reply) {
            const {id} = request.params;

            const record = await fastify.prisma.DeflectionDetail.findUnique({
                where: {id},
                include: {
                    deflectionDetailCategory: {
                        select: {
                            name: true,
                        },
                    },
                },
            });
            if (!record) {
                return reply.code(StatusCodes.NOT_FOUND).send({error: 'Deflection detail not found'});
            }
            const {
                deflectionDetailCategory,
                ...rest
            } = record;
            return reply.send({
                ...rest,
                deflectionDetailCategoryName: deflectionDetailCategory?.name ?? null,
            });
        });
}
