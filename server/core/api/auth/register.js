import { errorCodes } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Invite from '#models/invite.js';
import User from '#models/user.js';

export default async function (fastify, opts) {
  fastify.post('/register',
    {
      schema: {
        description: 'Creates a new User. If registration is disabled, then a valid Invite id is required.',
        body: User.RegisterSchema,
        response: {
          [StatusCodes.CREATED]: User.ResponseSchema,
          [StatusCodes.FORBIDDEN]: z.null(),
          [StatusCodes.GONE]: z.null(),
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.UNPROCESSABLE_ENTITY]: fastify.ValidationErrorSchema,
        },
      },
      attachValidation: true,
    },
    async function (request, reply) {
      const error = request.validationError ?? errorCodes.FST_ERR_VALIDATION();
      error.validation ||= [];
      const { firstName, lastName, email, password, inviteId } = request.body;
      // Check email is not already registered
      if (await fastify.prisma.user.findUnique({
        where: { email },
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
      // invite is required if registration is not enabled
      if (!inviteId && process.env.VITE_FEATURE_REGISTRATION !== 'true') {
        return reply.code(StatusCodes.FORBIDDEN).send(null);
      }
      let invite;
      if (inviteId) {
        const data = await fastify.prisma.invite.findUnique({
          where: { id: inviteId },
        });
        if (!data) {
          return reply.code(StatusCodes.NOT_FOUND).send(null);
        }
        invite = new Invite(data);
        if (!invite.isValid) {
          return reply.code(StatusCodes.GONE).send(null);
        }
      }
      let data = { firstName, lastName, email };
      const user = new User(data);
      // Hash the password
      await user.setPassword(password);
      // Create user in db
      await fastify.prisma.$transaction(async (tx) => {
        data = await tx.user.create({ data });
        if (invite) {
          await tx.invite.update({
            where: { id: invite.id },
            data: {
              acceptedAt: new Date(),
              acceptedById: data.id,
            },
          });
        }
      });
      return reply.code(StatusCodes.CREATED).send(new User(data));
    });
}
