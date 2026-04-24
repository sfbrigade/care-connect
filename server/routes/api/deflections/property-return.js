import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

function propertyReturnConflict (code) {
  const error = new Error(code);
  error.statusCode = StatusCodes.CONFLICT;
  error.code = code;
  return error;
}

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
          propertyReturned: z.boolean(),
          propertyNotReturnedReason: z.enum(Object.values(Deflection.PropertyNotReturnedReason)).nullable().optional(),
          propertyNotReturnedOtherReason: z.string().trim().min(1).nullable().optional(),
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
      const propertyReturned = request.body.propertyReturned;
      const propertyNotReturnedReason = request.body.propertyNotReturnedReason ?? null;
      const propertyNotReturnedOtherReason = request.body.propertyNotReturnedOtherReason?.trim() ?? null;

      if (!propertyReturned && !propertyNotReturnedReason) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          errors: [{
            path: 'propertyNotReturnedReason',
            message: 'Reason is required when property was not returned.',
          }],
        });
      }

      if (!propertyReturned && propertyNotReturnedReason === 'OTHER' && !propertyNotReturnedOtherReason) {
        return reply.code(StatusCodes.UNPROCESSABLE_ENTITY).send({
          errors: [{
            path: 'propertyNotReturnedOtherReason',
            message: 'Other reason is required when reason is Other.',
          }],
        });
      }

      const now = new Date();
      let deflection;

      try {
        await fastify.prisma.$transaction(async (tx) => {
          const lockedDeflection = await fastify.prisma.deflection.findByIdForUpdate(tx, id);
          if (!lockedDeflection) {
            const error = new Error('Deflection not found');
            error.statusCode = StatusCodes.NOT_FOUND;
            throw error;
          }

          const currentDeflection = await tx.deflection.findUnique({
            where: { id },
            include: {
              subject: true,
              propertyPhotos: true,
            },
          });

          if (currentDeflection.subjectStatus !== Deflection.SubjectStatus.RELEASED) {
            throw propertyReturnConflict('NOT_LEGALLY_RELEASED');
          }

          if (!hasAssociatedProperty(currentDeflection)) {
            throw propertyReturnConflict('NO_ASSOCIATED_PROPERTY');
          }

          if (currentDeflection.propertyReturned !== null) {
            throw propertyReturnConflict('ALREADY_RECORDED');
          }

          const data = {
            propertyReturned,
            propertyNotReturnedReason: propertyReturned ? null : propertyNotReturnedReason,
            propertyNotReturnedOtherReason: propertyReturned ? null : (propertyNotReturnedReason === 'OTHER' ? propertyNotReturnedOtherReason : null),
          };

          await tx.deflectionUpdate.create({
            data: {
              ...data,
              deflectionId: id,
              updatedById: request.user.id,
              updatedAt: now,
            },
          });

          deflection = await tx.deflection.update({
            where: { id },
            data: {
              ...data,
              propertyReturnedAt: now,
              propertyReturnedById: request.user.id,
              updatedAt: now,
            },
            include: {
              subject: true,
              propertyPhotos: true,
            },
          });
        });
      } catch (error) {
        if (error.statusCode === StatusCodes.NOT_FOUND) {
          return reply.code(StatusCodes.NOT_FOUND).send();
        }
        if (error.statusCode === StatusCodes.CONFLICT) {
          return reply.code(StatusCodes.CONFLICT).send({ code: error.code });
        }
        throw error;
      }

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));

      return reply.send(redactDeflectionForUser(deflection, request.user));
    }
  );
}
