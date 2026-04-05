import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import Subject from '#models/subject.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { canModifyDeflection } from '#lib/incidentPermissions.js';

export default async function (fastify, opts) {
  fastify.put('/:id/subject',
    {
      onRequest: fastify.requireUser,
      schema: {
        description: 'Upsert the subject of a deflection.',
        params: z.object({
          id: z.coerce.number(),
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

      if (!canModifyDeflection(deflection, request.user)) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const subjectData = { ...data };
      delete subjectData.narcoticsSubstance;
      delete subjectData.narcoticsParaphernalia;
      delete subjectData.drugUseEvidence;
      delete subjectData.drugType;

      const deflectionData = {
        narcoticsSubstance: data.narcoticsSubstance ?? null,
        narcoticsParaphernalia: data.narcoticsParaphernalia ?? null,
        drugUseEvidence: data.drugUseEvidence ?? null,
        drugType: data.drugUseEvidence === true ? data.drugType ?? null : null,
      };

      await fastify.prisma.$transaction(async (tx) => {
        if (!deflection.subjectId) {
          const subject = await tx.subject.create({
            data: subjectData,
          });

          deflection = await tx.deflection.update({
            where: { id },
            data: {
              ...deflectionData,
              subjectId: subject.id,
            },
            include: {
              subject: true,
              deflectionDetails: true,
              propertyPhotos: true,
            },
          });
        } else {
          await tx.subject.update({
            where: { id: deflection.subjectId },
            data: subjectData,
          });
          deflection = await tx.deflection.update({
            where: { id },
            data: {
              ...deflectionData,
            },
            include: {
              subject: true,
              deflectionDetails: true,
              propertyPhotos: true,
            },
          });
        }
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
