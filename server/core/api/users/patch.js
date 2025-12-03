import { errorCodes } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';
import { z } from 'zod';

import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      schema: {
        description: 'Updates a User object by id.',
        params: z.object({
          id: z.string().uuid()
        }),
        body: User.UpdateSchema,
        response: {
          [StatusCodes.OK]: User.ResponseSchema,
          [StatusCodes.FORBIDDEN]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
        },
      },
      attachValidation: true,
      onRequest: fastify.requireUser,
    },
    async function (request, reply) {
      const error = request.validationError ?? errorCodes.FST_ERR_VALIDATION();
      error.validation ||= [];
      const { id } = request.params;
      const { email, password, picture } = request.body;
      if (email && await fastify.prisma.user.findFirst({
        where: { id: { not: id }, email },
      })) {
        error.validation.push({
          params: {
            issue: {
              path: ['email'],
              message: 'Email already registered',
            }
          }
        });
      }
      if (error.validation.length) {
        throw error;
      }
      let data = await fastify.prisma.user.findUnique({
        where: { id },
      });
      if (!data) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }
      if (data.id !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }
      const user = new User(data);
      user.update(_.omit(request.body, ['password', 'picture']));
      // ensure only admins can change isAdmin and deactivatedAt params
      if (user.changes.intersection(new Set(['isAdmin', 'deactivatedAt'])).size && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }
      // update password _if provided_
      if (password) {
        await user.setPassword(password);
      }
      // update picture
      const pictureHandler = user.setAsset('picture', picture);
      await fastify.prisma.$transaction(async (tx) => {
        data = await tx.user.update({
          where: { id },
          data: _.pick(data, [...user.changes])
        });
        await pictureHandler?.();
      });
      return reply.send(new User(data));
    });
}
