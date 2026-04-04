import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

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
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.CONFLICT]: z.null(),
          [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({
            message: z.string(),
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
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (deflection.status !== Deflection.HoldStatus.ACTIVE) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      // Can't hand off to yourself
      if (deflection.currentOfficerId === receivingOfficerId) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      // Receiving officer must not have their own active incident
      const existingIncident = await fastify.prisma.incident.findFirst({
        where: {
          createdById: receivingOfficerId,
          completedAt: null,
        },
      });

      if (existingIncident) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          message: 'You already have an active incident. Cannot accept a handoff.',
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
            deflectionDetails: true,
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
            handedOffAt: now,
            handedOffById: previousOfficerId,
            badgeNumber: request.user.badgeNumber,
            organizationId: request.user.organizationId,
            unitId: request.user.unitId,
            titleId: request.user.titleId,
          },
          update: {
            // Officer may already have an IncidentOfficer record if they
            // previously received other holds from this same incident
            handedOffAt: now,
            handedOffById: previousOfficerId,
          },
        });
      });

      updatedDeflection.propertyPhotos = updatedDeflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(updatedDeflection, request.user));
    });
}
