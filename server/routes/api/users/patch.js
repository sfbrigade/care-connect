import { errorCodes } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';
import crypto from 'node:crypto';
import { z } from 'zod';

import User from '#models/user.js';

function slugify (value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function resolveUnitId (tx, { organizationId, userId, unitId, unitName }) {
  const trimmedUnitName = unitName?.trim();

  if (!trimmedUnitName || unitId) {
    return unitId;
  }

  const existingUnit = await tx.unit.findFirst({
    where: {
      organizationId,
      name: {
        equals: trimmedUnitName,
        mode: 'insensitive',
      },
    },
  });

  if (existingUnit) {
    return existingUnit.id;
  }

  const baseId = slugify(trimmedUnitName) || crypto.randomUUID();
  let nextUnitId = baseId;
  let suffix = 2;

  while (await tx.unit.findUnique({
    where: {
      unitId: {
        id: nextUnitId,
        organizationId,
      },
    },
  })) {
    nextUnitId = `${baseId}_${suffix}`;
    suffix++;
  }

  const createdUnit = await tx.unit.create({
    data: {
      id: nextUnitId,
      name: trimmedUnitName,
      organizationId,
      createdById: userId,
    },
  });

  return createdUnit.id;
}

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
      if (id === User.BATCH_USER_ID) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }
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
      // Self-protection: prevent users from disabling/deleting their own account
      if (data.id === request.user.id) {
        const selfProtectedFields = ['deactivatedAt', 'deletedAt'];
        const bodyFields = Object.keys(_.omit(request.body, ['password', 'picture']));
        if (bodyFields.some((f) => selfProtectedFields.includes(f))) {
          return reply.code(StatusCodes.FORBIDDEN).send();
        }
      }
      if (data.id !== request.user.id && !request.user.isAdmin) {
        // Check if org admin editing a user in their org
        const requestUser = new User(request.user);
        if (requestUser.isOrgAdmin && data.organizationId === request.user.organizationId) {
          // Org admins can only change deactivatedAt and deletedAt
          const allowedFields = new Set(['deactivatedAt', 'deletedAt']);
          const bodyFields = Object.keys(_.omit(request.body, ['password', 'picture']));
          const hasDisallowedFields = bodyFields.some((f) => !allowedFields.has(f));
          if (hasDisallowedFields) {
            return reply.code(StatusCodes.FORBIDDEN).send();
          }
        } else {
          return reply.code(StatusCodes.FORBIDDEN).send();
        }
      }
      const user = new User(data);
      // Convert empty strings to null for nullable fields
      const updateData = _.omit(request.body, ['password', 'picture', 'unitName']);
      if (updateData.badgeNumber === '') updateData.badgeNumber = null;
      if (updateData.titleId === '') updateData.titleId = null;
      if (updateData.unitId === '') updateData.unitId = null;
      user.update(updateData);
      // ensure only admins can change isAdmin and deactivatedAt params
      if (user.changes.intersection(new Set(['isAdmin', 'deactivatedAt', 'deletedAt'])).size && !request.user.isAdmin) {
        // Allow org admins to change deactivatedAt (but not isAdmin) for users in their org
        const requestUser = new User(request.user);
        if (requestUser.isOrgAdmin && data.organizationId === request.user.organizationId) {
          if (user.changes.has('isAdmin')) {
            return reply.code(StatusCodes.FORBIDDEN).send();
          }
        } else {
          return reply.code(StatusCodes.FORBIDDEN).send();
        }
      }
      // update password _if provided_
      if (password) {
        await user.setPassword(password);
      }
      // update picture
      const pictureHandler = user.setAsset('picture', picture);
      await fastify.prisma.$transaction(async (tx) => {
        if (request.body.unitName && data.organizationId) {
          data.unitId = await resolveUnitId(tx, {
            organizationId: data.organizationId,
            userId: request.user.id,
            unitId: data.unitId,
            unitName: request.body.unitName,
          });
          user.changes.add('unitId');
        }

        data = await tx.user.update({
          where: { id },
          include: {
            organization: true,
            title: true,
            unit: true,
          },
          data: _.pick(data, [...user.changes])
        });
        await pictureHandler?.();
      });
      return reply.send(new User(data));
    });
}
