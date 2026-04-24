import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { canModifyDeflection } from '#lib/incidentPermissions.js';
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

      if (!canModifyDeflection(deflection, request.user)) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const updated = await fastify.prisma.deflection.update({
        where: { id },
        data,
        include: {
          subject: true,
          cancelReason: true,
          incident: true,
          propertyPhotos: true,
        },
      });

      updated.propertyPhotos = updated.propertyPhotos.map(photo => new PropertyPhoto(photo));

      const hasDocument = await fastify.prisma.deflectionDocument.findUnique({
        where: { deflectionId_formId: { deflectionId: id, formId: '647f' } },
      });
      if (hasDocument) {
        await fastify.backgroundJobs.send(QUEUE_GENERATE_FORMS, {
          deflectionId: id,
          userId: request.user.id,
          formIds: ['647f'],
        });
      }

      return reply.send(redactDeflectionForUser(updated, request.user));
    });
}
