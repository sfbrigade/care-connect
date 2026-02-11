import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import DeflectionCancelReason from '#models/deflectionCancelReason.js';

export default async function (fastify, opts) {
    fastify.post('/:id', {
        onRequest: fastify.requireUser,
        schema: {
            description: 'Reopen a cancelled or expired deflection.',
            params: z.object({
                id: z.string(),
            }),
            response: {
                [StatusCodes.OK]: DeflectionCancelReason.ResponseSchema,
                [StatusCodes.NOT_FOUND]: z.object({
                    error: z.string(),
                }),
            }
        }
    },
        async function (request, reply) {
            const { id } = request.params;
            const reason = await fastify.prisma.DeflectionCancelReason.update({
                where: {
                    id: id
                },
                data: {
                    status:'active',
                    cancelReasonId: null
                }
            })

            return reply.code(StatusCodes.OK).send(reason);
        }
    )
}