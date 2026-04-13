import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { getActiveIncidentForOfficer, isIncidentDetailsComplete } from '#lib/incidentPermissions.js';

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

      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
        include: { incident: true },
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

      // Receiving officer must not have an active incident on a DIFFERENT incident
      const existingIncident = await getActiveIncidentForOfficer(fastify.prisma, deflection.facilityId, receivingOfficerId);
      if (existingIncident && existingIncident.id !== deflection.incidentId) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          errors: [{ path: '_form', message: 'You already have an active incident. Cannot accept a handoff.' }],
        });
      }

      let updatedDeflection;
      await fastify.prisma.$transaction(async (tx) => {
        const now = new Date();
        const previousOfficerId = deflection.currentOfficerId;

        // Update the deflection's current officer
        updatedDeflection = await tx.deflection.update({
          where: { id },
          data: {
            currentOfficerId: receivingOfficerId,
            updatedAt: now,
          },
          include: {
            subject: true,
            propertyPhotos: true,
          },
        });

        // Create audit trail
        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            subjectStatus: deflection.subjectStatus,
            updatedById: receivingOfficerId,
            updatedAt: now,
          },
        });

        // Create or update IncidentOfficer record for receiving officer
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

      updatedDeflection.propertyPhotos = updatedDeflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(updatedDeflection, request.user));
    });
}
