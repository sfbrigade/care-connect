import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import Subject from '#models/subject.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';
import { canModifyDeflection } from '#lib/incidentPermissions.js';
import { QUEUE_GENERATE_FORMS } from '#lib/jobQueue/queueNames.js';

const CARE_EDITABLE_SUBJECT_FIELDS = [
  'firstName',
  'lastName',
  'middleInitial',
  'dateOfBirth',
  'sex',
  'race',
  'driverLicense',
  'preferredLanguage',
];

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
          propertyPhotos: true,
        },
      });

      if (!deflection || deflection.subject?.anonymizedAt) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      const canModifyFullDeflection = canModifyDeflection(deflection, request.user);
      const isCareSubjectEdit = request.user.isCare && !canModifyFullDeflection;

      if (!canModifyFullDeflection && !isCareSubjectEdit) {
        return reply.code(StatusCodes.FORBIDDEN).send();
      }

      const subjectData = isCareSubjectEdit
        ? Object.fromEntries(CARE_EDITABLE_SUBJECT_FIELDS
          .filter(field => Object.hasOwn(data, field))
          .map(field => [field, data[field]]))
        : { ...data };

      if (!isCareSubjectEdit) {
        delete subjectData.narcoticsSubstance;
        delete subjectData.narcoticsParaphernalia;
        delete subjectData.drugUseEvidence;
        delete subjectData.drugType;
      }

      const deflectionData = isCareSubjectEdit
        ? null
        : {
            narcoticsSubstance: data.narcoticsSubstance ?? null,
            narcoticsParaphernalia: data.narcoticsParaphernalia ?? null,
            drugUseEvidence: data.drugUseEvidence ?? null,
            drugType: data.drugUseEvidence === true ? data.drugType ?? null : null,
          };

      await fastify.prisma.$transaction(async (tx) => {
        await fastify.prisma.deflection.findByIdForUpdate(tx, id);

        const currentDeflection = await tx.deflection.findUnique({
          where: { id },
          include: {
            subject: true,
            incident: true,
            propertyPhotos: true,
          },
        });

        const lockedDeflectionData = isCareSubjectEdit
          ? {
              narcoticsSubstance: currentDeflection.narcoticsSubstance,
              narcoticsParaphernalia: currentDeflection.narcoticsParaphernalia,
              drugUseEvidence: currentDeflection.drugUseEvidence,
              drugType: currentDeflection.drugUseEvidence === true ? currentDeflection.drugType ?? null : null,
            }
          : deflectionData;

        if (!currentDeflection.subjectId) {
          const subject = await tx.subject.create({
            data: subjectData,
          });

          deflection = await tx.deflection.update({
            where: { id },
            data: {
              ...lockedDeflectionData,
              subjectId: subject.id,
            },
            include: {
              subject: true,
              incident: true,
              propertyPhotos: true,
            },
          });
        } else {
          await tx.subject.update({
            where: { id: currentDeflection.subjectId },
            data: subjectData,
          });
          deflection = await tx.deflection.update({
            where: { id },
            data: {
              ...lockedDeflectionData,
            },
            include: {
              subject: true,
              incident: true,
              propertyPhotos: true,
            },
          });
        }
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

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

      return reply.send(redactDeflectionForUser(deflection, request.user));
    });
}
