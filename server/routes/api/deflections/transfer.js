import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { isIncidentDetailsComplete, isDeflectionDetailsComplete } from '#lib/incidentPermissions.js';
import { QUEUE_GENERATE_FORMS } from '#lib/jobQueue/queueNames.js';
import { conflictError } from '#lib/httpErrors.js';

function unprocessableFormError (message) {
  const error = new Error(message);
  error.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
  return error;
}

export default async function (fastify, opts) {
  fastify.post('/:id/transfer',
    {
      onRequest: fastify.requireCustody,
      schema: {
        description: 'Transfer a deflection into custody.',
        params: z.object({
          id: z.coerce.number(),
        }),
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.FORBIDDEN]: z.null(),
          [StatusCodes.CONFLICT]: z.null(),
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

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      try {
        await fastify.prisma.$transaction(async (tx) => {
          const { bedTypeId } = deflection;
          const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);
          // re-fetch deflection after lock
          deflection = await tx.deflection.findUnique({
            where: { id },
            include: {
              incident: true,
              subject: true,
              propertyPhotos: true,
            },
          });

          if (deflection.status !== Deflection.HoldStatus.ACTIVE || deflection.subjectStatus !== Deflection.SubjectStatus.ONSITE_AWAITING_TRANSFER) {
            throw conflictError(`Deflection ${id} cannot be transferred: status=${deflection.status}, subjectStatus=${deflection.subjectStatus}; expected status=ACTIVE and subjectStatus=ONSITE_AWAITING_TRANSFER`);
          }

          if (!isIncidentDetailsComplete(deflection.incident) || !isDeflectionDetailsComplete(deflection)) {
            throw unprocessableFormError('Some required details are missing. Ask the officer to finish them before transferring.');
          }

          const now = new Date();
          await tx.deflectionUpdate.create({
            data: {
              deflectionId: id,
              subjectStatus: Deflection.SubjectStatus.AWAITING_INTAKE,
              updatedById: request.user.id,
              updatedAt: now,
            },
          });

          deflection = await tx.deflection.update({
            where: { id },
            data: {
              subjectStatus: Deflection.SubjectStatus.AWAITING_INTAKE,
              transferredAt: now,
              transferredById: request.user.id,
              updatedAt: now,
            },
            include: {
              subject: true,
              propertyPhotos: true,
            },
          });

          // Person transitions from ONSITE_AWAITING_TRANSFER → AWAITING_INTAKE.
          // Both are hold statuses, so holds/occupied/available don't change.
          // But the person is no longer "in transit" (they've arrived at the facility).
          const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, inTransit, available } = bedType;
          const updatedData = {
            capacity,
            unavailableUnoccupied,
            unavailableOccupied,
            occupied,
            holds,
            inTransit: Math.max(0, inTransit - 1),
            available,
            updateMethod: 'API',
            updatedById: request.user.id,
          };
          await tx.bedTypeUpdate.create({
            data: {
              ...updatedData,
              bedTypeId,
              facilityId: deflection.facilityId,
            },
          });
          await tx.bedType.update({
            where: { id: bedTypeId },
            data: updatedData,
          });
        });
      } catch (error) {
        if (error.statusCode === StatusCodes.CONFLICT) {
          return reply.code(StatusCodes.CONFLICT).send();
        }
        if (error.statusCode === StatusCodes.UNPROCESSABLE_ENTITY) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: error.message }],
          });
        }
        throw error;
      }

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
        deflectionId: deflection.id,
        userId: request.user.id,
        formIds: ['647f'],
        emailTemplate: 'transfer-form',
        recipientEmail: [
          'SFPD.Data.Transfer.Authorized@sfgov.org',
          'Andrew.bley@sfgov.org',
          'Sfso-incidentreports@sfgov.org',
        ],
      });

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
