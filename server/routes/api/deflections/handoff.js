import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { getActiveIncidentForOfficer, isIncidentDetailsComplete } from '#lib/incidentPermissions.js';

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

        if (!isIncidentDetailsComplete(deflection.incident)) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: 'Incident details must be complete before handing off.' }],
          });
        }

        if (deflection.currentOfficerId === receivingOfficerId) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: 'You already control this hold.' }],
          });
        }

        if (
          !deflection.handoffReadyAt ||
          (Date.now() - new Date(deflection.handoffReadyAt).getTime()) > HANDOFF_READY_TTL_MS
        ) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: 'This hold is not available for handoff.' }],
          });
        }

        const existingIncident = await getActiveIncidentForOfficer(fastify.prisma, deflection.facilityId, receivingOfficerId);
        if (existingIncident && existingIncident.id !== deflection.incidentId) {
          return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
            errors: [{ path: '_form', message: 'You already have an active incident. Cannot accept a handoff.' }],
          });
        }

        // Stale QR: custody moved since handoff was initiated
        if (deflection.handoffFromOfficerId !== deflection.currentOfficerId) {
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
            handoffFromOfficerId: null,
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

        await tx.incidentOfficer.upsert({
          where: {
            incidentId_facilityId_officerId: {
              incidentId: deflection.incidentId,
              facilityId: deflection.facilityId,
              officerId: receivingOfficerId,
            },
          },
          create: {
            incidentId: deflection.incidentId,
            facilityId: deflection.facilityId,
            officerId: receivingOfficerId,
            role: 'RECEIVING',
            handoffReceivedAt: now,
            handoffReceivedFromId: previousOfficerId,
            badgeNumber: request.user.badgeNumber,
            organizationId: request.user.organizationId,
            unitId: request.user.unitId,
            titleId: request.user.titleId,
          },
          update: {
            // Officer may already have an IncidentOfficer record if they
            // previously received other holds from this same incident
            handoffReceivedAt: now,
            handoffReceivedFromId: previousOfficerId,
          },
        });
      });

      if (!updatedDeflection) return;

      updatedDeflection.propertyPhotos = updatedDeflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(updatedDeflection, request.user));
    });
}
