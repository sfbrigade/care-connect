import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { isIncidentDetailsComplete } from '#lib/incidentPermissions.js';

function unprocessableFormError (message) {
  const error = new Error(message);
  error.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
  return error;
}

export default async function (fastify) {
  fastify.post('/:id/handoff',
    {
      onRequest: fastify.requireField,
      schema: {
        description: 'Hand off a deflection to another FIELD officer.',
        params: z.object({
          id: z.coerce.number(),
        }),
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
          [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({
            errors: z.array(z.object({
              path: z.string(),
              message: z.string(),
            })),
          }),
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const receivingOfficerId = request.user.id;

      let updatedDeflection;
      try {
        await fastify.prisma.$transaction(async (tx) => {
          const HANDOFF_READY_TTL_MS = 3 * 60 * 1000;
          const lockedDeflection = await fastify.prisma.deflection.findByIdForUpdate(tx, id);

          if (!lockedDeflection) {
            throw unprocessableFormError('Handoff code not recognized. Check the code and try again.');
          }

          const deflection = await tx.deflection.findUnique({
            where: { id },
            include: {
              incident: true,
              subject: true,
              propertyPhotos: true,
            },
          });

          if (deflection.status !== Deflection.HoldStatus.ACTIVE) {
            throw unprocessableFormError('This hold is no longer active.');
          }

          if (!isIncidentDetailsComplete(deflection.incident)) {
            throw unprocessableFormError('Incident details must be complete before handing off.');
          }

          if (deflection.currentOfficerId === receivingOfficerId) {
            throw unprocessableFormError('You already control this hold.');
          }

          if (
            !deflection.handoffReadyAt ||
            (Date.now() - new Date(deflection.handoffReadyAt).getTime()) > HANDOFF_READY_TTL_MS
          ) {
            throw unprocessableFormError('This hold is not available for handoff.');
          }

          const now = new Date();
          const previousOfficerId = deflection.currentOfficerId;

          updatedDeflection = await tx.deflection.update({
            where: { id },
            data: {
              currentOfficerId: receivingOfficerId,
              handoffReadyAt: null,
              updatedAt: now,
            },
            include: {
              subject: true,
              propertyPhotos: true,
            },
          });

          await tx.deflectionUpdate.create({
            data: {
              deflectionId: id,
              subjectStatus: deflection.subjectStatus,
              updatedById: receivingOfficerId,
              updatedAt: now,
            },
          });

          await tx.handoff.create({
            data: {
              deflectionId: id,
              fromOfficerId: previousOfficerId,
              toOfficerId: receivingOfficerId,
              timestamp: now,
            },
          });
        });
      } catch (error) {
        if (error.statusCode === StatusCodes.UNPROCESSABLE_ENTITY) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: error.message }],
          });
        }
        throw error;
      }

      updatedDeflection.propertyPhotos = updatedDeflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(updatedDeflection, request.user));
    });
}
