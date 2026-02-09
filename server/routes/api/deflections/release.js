import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';

const RELEASABLE_STATUSES = [
  Deflection.SubjectStatus.AWAITING_INTAKE,
  Deflection.SubjectStatus.READY_FOR_INTAKE,
  Deflection.SubjectStatus.ADMITTED,
  Deflection.SubjectStatus.IN_CHAIR,
];

export default async function (fastify, opts) {
  fastify.post('/:id/release',
    {
      onRequest: fastify.requireCustody,
      schema: {
        description: 'Mark a subject as legally released, transitioning to RELEASED status.',
        params: z.object({
          id: z.coerce.number(),
        }),
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.CONFLICT]: z.null(),
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

      if (!RELEASABLE_STATUSES.includes(deflection.subjectStatus)) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      const now = new Date();
      await fastify.prisma.deflectionUpdate.create({
        data: {
          deflectionId: id,
          subjectStatus: Deflection.SubjectStatus.RELEASED,
          updatedById: request.user.id,
          updatedAt: now,
        },
      });

      deflection = await fastify.prisma.deflection.update({
        where: { id },
        data: {
          subjectStatus: Deflection.SubjectStatus.RELEASED,
          releasedAt: now,
          releasedById: request.user.id,
          updatedAt: now,
        },
        include: {
          subject: true,
          deflectionDetails: true,
          propertyPhotos: true,
        },
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(deflection);
    });
}
