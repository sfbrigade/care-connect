import { errorCodes } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';
import crypto from 'node:crypto';
import { z } from 'zod';

import slugifyUnitId from '#lib/slugifyUnitId.js';
import User from '#models/user.js';

const ORG_ADMIN_ALLOWED_FIELDS = new Set([
  'firstName',
  'lastName',
  'email',
  'badgeNumber',
  'titleId',
  'unitId',
  'unitName',
  'prop115Certified',
  'deactivatedAt',
  'deletedAt',
]);

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

  const baseId = slugifyUnitId(trimmedUnitName) || crypto.randomUUID();
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
      const { email, picture } = request.body;
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
      // Convert empty strings to null for nullable fields
      const updateData = _.omit(request.body, ['password', 'picture', 'unitName']);
      if (updateData.organizationId === '') updateData.organizationId = null;
      if (updateData.badgeNumber === '') updateData.badgeNumber = null;
      if (updateData.titleId === '') updateData.titleId = null;
      if (updateData.unitId === '') updateData.unitId = null;
      const requestUser = new User(request.user);
      const bodyFields = Object.keys(_.omit(request.body, ['password', 'picture']));

      let data;
      let lockedMissing = false;
      let lockedForbidden = false;
      await fastify.prisma.$transaction(async (tx) => {
        data = await tx.user.findByIdForUpdate(tx, id);
        if (!data) {
          lockedMissing = true;
          return;
        }

        // Self-protection: a user cannot disable/delete their own account.
        if (data.id === request.user.id) {
          if (bodyFields.some((f) => f === 'deactivatedAt' || f === 'deletedAt')) {
            lockedForbidden = true;
            return;
          }
        }

        // Authorization: caller must be self, platform admin, or an org admin
        // acting within their own org. Org admins are additionally limited to
        // ORG_ADMIN_ALLOWED_FIELDS.
        if (data.id !== request.user.id && !request.user.isAdmin) {
          const inSameOrg = requestUser.isOrgAdmin && data.organizationId === request.user.organizationId;
          if (!inSameOrg || bodyFields.some((f) => !ORG_ADMIN_ALLOWED_FIELDS.has(f))) {
            lockedForbidden = true;
            return;
          }
        }

        const user = new User(data);
        user.update(updateData);

        // Privileged-field guard: only platform admins can flip isAdmin or
        // change roles; org admins may flip deactivatedAt/deletedAt for users
        // in their org but never isAdmin or roles.
        if (
          user.changes.intersection(new Set(['isAdmin', 'roles', 'deactivatedAt', 'deletedAt'])).size &&
          !request.user.isAdmin
        ) {
          const inSameOrg = requestUser.isOrgAdmin && data.organizationId === request.user.organizationId;
          if (!inSameOrg || user.changes.has('isAdmin') || user.changes.has('roles')) {
            lockedForbidden = true;
            return;
          }
        }

        const pictureHandler = user.setAsset('picture', picture);

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
      if (lockedMissing) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }
      if (lockedForbidden) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }
      return reply.send(new User(data));
    });
}
