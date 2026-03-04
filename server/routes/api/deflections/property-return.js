import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

const PROPERTY_RETURN_REASONS = ['ABANDONED', 'DESTROYED', 'OTHER'];

function hasAssociatedProperty (deflection) {
  const hasPropertyVolume = deflection?.property && deflection.property !== 'NONE';
  const hasPropertyDescription = Boolean(deflection?.propertyDetails?.trim());
  const hasPropertyPhotos = (deflection?.propertyPhotos?.length ?? 0) > 0;
  return hasPropertyVolume || hasPropertyDescription || hasPropertyPhotos;
}

export default async function (fastify, opts) {
  fastify.post('/:id/property-return',
    {
      onRequest: fastify.requireCustody,
      schema: {
        description: 'Record whether personal property was returned after legal release.',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: z.object({
          returned: z.boolean(),
          reason: z.enum(PROPERTY_RETURN_REASONS).optional(),
          otherReason: z.string().trim().min(1).optional(),
        }),
        response: {
          [StatusCodes.OK]: Deflection.ResponseSchema,
          [StatusCodes.NOT_FOUND]: z.null(),
          [StatusCodes.CONFLICT]: z.object({
            code: z.string(),
          }),
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
      const returned = request.body.returned;
      const reason = request.body.reason ?? null;
      const otherReason = request.body.otherReason?.trim() ?? null;

      if (!returned && !reason) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          errors: [{
            path: 'reason',
            message: 'Reason is required when property was not returned.',
          }],
        });
      }

      if (!returned && reason === 'OTHER' && !otherReason) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          errors: [{
            path: 'otherReason',
            message: 'Other reason is required when reason is Other.',
          }],
        });
      }

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

      if (deflection.subjectStatus !== Deflection.SubjectStatus.RELEASED) {
        return reply.code(StatusCodes.CONFLICT).send({ code: 'NOT_LEGALLY_RELEASED' });
      }

      if (!hasAssociatedProperty(deflection)) {
        return reply.code(StatusCodes.CONFLICT).send({ code: 'NO_ASSOCIATED_PROPERTY' });
      }

      if (deflection.propertyReturned !== null) {
        return reply.code(StatusCodes.CONFLICT).send({ code: 'ALREADY_RECORDED' });
      }

      const now = new Date();

      await fastify.prisma.$transaction(async (tx) => {
        const locked = await tx.deflection.findUnique({
          where: { id },
          include: {
            subject: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });

        if (!locked || locked.subjectStatus !== Deflection.SubjectStatus.RELEASED) {
          return reply.code(StatusCodes.CONFLICT).send({ code: 'NOT_LEGALLY_RELEASED' });
        }

        if (!hasAssociatedProperty(locked)) {
          return reply.code(StatusCodes.CONFLICT).send({ code: 'NO_ASSOCIATED_PROPERTY' });
        }

        if (locked.propertyReturned !== null) {
          return reply.code(StatusCodes.CONFLICT).send({ code: 'ALREADY_RECORDED' });
        }

        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            propertyReturned: returned,
            propertyReturnReason: returned ? null : reason,
            propertyReturnOtherReason: returned ? null : (reason === 'OTHER' ? otherReason : null),
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        deflection = await tx.deflection.update({
          where: { id },
          data: {
            propertyReturned: returned,
            propertyReturnReason: returned ? null : reason,
            propertyReturnOtherReason: returned ? null : (reason === 'OTHER' ? otherReason : null),
            propertyReturnedAt: now,
            propertyReturnedById: request.user.id,
            updatedAt: now,
          },
          include: {
            subject: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));
      return reply.send(redactDeflectionForUser(deflection, request.user));
    }
  );
}
