import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import DeflectionDocument from '#models/deflectionDocument.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import smsNotifications from '#lib/smsNotifications.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { canModifyDeflection, canModifyDeflectionProperty, isDeflectionPropertyUpdate } from '#lib/incidentPermissions.js';
import { QUEUE_GENERATE_FORMS } from '#lib/jobQueue/queueNames.js';

export default async function (fastify, opts) {
  fastify.patch('/:id',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Update a deflection.',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: Deflection.UpdateSchema,
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;

      const deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      const canModify = isDeflectionPropertyUpdate(data)
        ? canModifyDeflectionProperty(deflection, request.user)
        : canModifyDeflection(deflection, request.user);

      if (!canModify) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const updated = await fastify.prisma.deflection.update({
        where: { id },
        data,
        include: {
          subject: true,
          incident: true,
          deflectionDocuments: true,
          propertyPhotos: true,
        },
      });

      updated.deflectionDocuments = updated.deflectionDocuments.map(doc => new DeflectionDocument(doc));
      updated.propertyPhotos = updated.propertyPhotos.map(photo => new PropertyPhoto(photo));

      if (Object.prototype.hasOwnProperty.call(data, 'releaseNarrative')) {
        await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
          deflectionId: id,
          userId: request.user.id,
          formIds: ['849b'],
        });
      } else if (await fastify.prisma.deflectionDocument.findUnique({
        where: { deflectionId_formId: { deflectionId: id, formId: '647f' } },
      })) {
        await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
          deflectionId: id,
          userId: request.user.id,
          formIds: ['647f'],
        });
      }

      // Fire-and-forget: completing deflection details may make this hold ready
      // for transfer → NEW_HOLD ("in transit"). Never block/fail the request.
      smsNotifications
        .maybeNotifyReadyHolds(fastify, { facilityId: updated.facilityId, incidentId: updated.incidentId })
        .catch((err) => fastify.log.error({ err }, 'SMS ready-hold notification failed'));

      return reply.send(redactDeflectionForUser(updated, request.user));
    });
}
