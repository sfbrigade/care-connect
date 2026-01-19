import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import Subject from '#models/subject.js';

export default async function (fastify, opts) {
  fastify.put('/:id/subject',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Upsert the subject of a deflection.',
        params: z.object({
          id: z.string().uuid(),
        }),
        body: Subject.UpdateSchema,
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params;
      const data = request.body;

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
        include: {
          subject: true,
          deflectionDetails: true,
          propertyPhotos: true,
        },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (deflection.createdById !== request.user.id && !request.user.isAdmin) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      if (!deflection.subjectId) {
        await fastify.prisma.$transaction(async (tx) => {
          const subject = await tx.subject.create({
            data
          });

          deflection = await tx.deflection.update({
            where: { id },
            data: {
              subjectId: subject.id,
            },
            include: {
              subject: true,
              deflectionDetails: true,
              propertyPhotos: true,
            },
          });
        });
      } else {
        const subject = await fastify.prisma.subject.update({
          where: { id: deflection.subjectId },
          data,
        });
        deflection.subject = subject;
      }

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(deflection);
    });
}
