import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { isIncidentDetailsComplete } from '#lib/incidentPermissions.js';

const HANDOFF_READY_TTL_MS = 3 * 60 * 1000;

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
      await fastify.prisma.$transaction(async (tx) => {
        await fastify.prisma.deflection.findByIdForUpdate(tx, id);
        const deflection = await tx.deflection.findUnique({
          where: { id },
          include: { incident: true, subject: true, propertyPhotos: true },
        });

        if (!deflection) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: 'Handoff code not recognized. Check the code and try again.' }],
          });
        }

        if (deflection.status !== Deflection.HoldStatus.ACTIVE) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: 'This hold is no longer active.' }],
          });
        }

        // Incident details must be complete before handoff
        if (!isIncidentDetailsComplete(deflection.incident)) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: 'Incident details must be complete before handing off.' }],
          });
        }

        // Can't hand off to yourself
        if (deflection.currentOfficerId === receivingOfficerId) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: 'You already control this hold.' }],
          });
        }

        // Handoff ready gate: current owner must have initiated handoff recently
        if (
          !deflection.handoffReadyAt ||
          (Date.now() - new Date(deflection.handoffReadyAt).getTime()) > HANDOFF_READY_TTL_MS
        ) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: 'This hold is not available for handoff.' }],
          });
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

        // Record the handoff
        await tx.handoff.create({
          data: {
            deflectionId: id,
            fromOfficerId: previousOfficerId,
            toOfficerId: receivingOfficerId,
            timestamp: now,
          },
        });
      });

      if (!updatedDeflection) return;

      updatedDeflection.propertyPhotos = updatedDeflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(updatedDeflection, request.user));
    });
}
