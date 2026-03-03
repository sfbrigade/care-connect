import { StatusCodes } from 'http-status-codes';
import { TernaryEnum } from '@prisma/client';
import { z } from 'zod';

import Deflection from '#models/deflection.js';
import PropertyPhoto from '#models/propertyPhoto.js';
import { redactDeflectionForUser } from '#lib/deflectionVisibility.js';

const ExitDestinationEnum = z.enum([
  'JAIL',
  'HOSPITAL',
  'STREET',
  'HOME',
  'SERVICES_NON_HOSPITAL',
  'DECLINED_CONSENT',
  'OTHER',
]);

const HousingStatusEnum = z.enum([
  'PERMANENT',
  'SHELTERED',
  'TEMPORARY',
  'UNKNOWN',
  'DECLINED_CONSENT',
]);

const ResidencyEnum = z.enum([
  'YES',
  'NO',
  'UNKNOWN',
  'DECLINED_CONSENT',
]);

const ConnectionToCareEnum = z.enum([
  'YES',
  'NO',
  'UNKNOWN',
]);

const EXIT_DESTINATION_DEFS = {
  JAIL: { id: 'jail', name: 'Jail' },
  HOSPITAL: { id: 'hospital', name: 'Hospital' },
  STREET: { id: 'street', name: 'Street' },
  HOME: { id: 'home', name: 'Home' },
  SERVICES_NON_HOSPITAL: { id: 'services_non_hospital', name: 'Services - non-hospital' },
  DECLINED_CONSENT: { id: 'declined_consent', name: 'Declined consent' },
  OTHER: { id: 'other', name: 'Other' },
};

const EXIT_HOUSING_STATUS_DEFS = {
  PERMANENT: { id: 'permanent', name: 'Permanent' },
  SHELTERED: { id: 'sheltered', name: 'Sheltered' },
  TEMPORARY: { id: 'temporary', name: 'Temporary' },
  UNKNOWN: { id: 'unknown', name: 'Unknown' },
  DECLINED_CONSENT: { id: 'declined_consent', name: 'Declined consent' },
};

function toTernary (value) {
  if (value === 'DECLINED_CONSENT') return TernaryEnum.UNKNOWN;
  return value;
}

export default async function (fastify, opts) {
  fastify.post('/:id/exit',
    {
      onRequest: fastify.requireCare,
      schema: {
        description: 'Record exit details and transition a person from IN_CHAIR to EXITED.',
        params: z.object({
          id: z.coerce.number(),
        }),
        body: z.object({
          exitDestination: ExitDestinationEnum,
          sfResidencyStatus: ResidencyEnum,
          housingStatus: HousingStatusEnum,
          connectionToCare: ConnectionToCareEnum,
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
      const {
        exitDestination,
        sfResidencyStatus,
        housingStatus,
        connectionToCare,
      } = request.body;

      let deflection = await fastify.prisma.deflection.findUnique({
        where: { id },
      });

      if (!deflection) {
        return reply.code(StatusCodes.NOT_FOUND).send();
      }

      if (deflection.subjectStatus !== Deflection.SubjectStatus.IN_CHAIR) {
        return reply.code(StatusCodes.CONFLICT).send();
      }

      const destinationDef = EXIT_DESTINATION_DEFS[exitDestination];
      const housingDef = EXIT_HOUSING_STATUS_DEFS[housingStatus];

      await fastify.prisma.$transaction(async (tx) => {
        const { bedTypeId } = deflection;
        const bedType = await fastify.prisma.bedType.findByIdForUpdate(tx, bedTypeId);

        deflection = await tx.deflection.findUnique({
          where: { id },
          include: {
            subject: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });

        if (deflection.subjectStatus !== Deflection.SubjectStatus.IN_CHAIR) {
          return reply.code(StatusCodes.CONFLICT).send();
        }

        const now = new Date();

        await tx.deflectionExitDestination.upsert({
          where: { id: destinationDef.id },
          create: {
            id: destinationDef.id,
            name: destinationDef.name,
            createdById: request.user.id,
            updatedById: request.user.id,
          },
          update: {
            name: destinationDef.name,
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        await tx.deflectionExitHousingStatus.upsert({
          where: { id: housingDef.id },
          create: {
            id: housingDef.id,
            name: housingDef.name,
            createdById: request.user.id,
            updatedById: request.user.id,
          },
          update: {
            name: housingDef.name,
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        await tx.deflectionUpdate.create({
          data: {
            deflectionId: id,
            subjectStatus: Deflection.SubjectStatus.EXITED,
            exitDestinationId: destinationDef.id,
            exitHousingStatusId: housingDef.id,
            exitConnectedToCare: connectionToCare,
            exitSFResident: toTernary(sfResidencyStatus),
            updatedById: request.user.id,
            updatedAt: now,
          },
        });

        deflection = await tx.deflection.update({
          where: { id },
          data: {
            subjectStatus: Deflection.SubjectStatus.EXITED,
            exitedAt: now,
            exitedById: request.user.id,
            exitDestinationId: destinationDef.id,
            exitHousingStatusId: housingDef.id,
            exitConnectedToCare: connectionToCare,
            exitSFResident: toTernary(sfResidencyStatus),
            updatedAt: now,
          },
          include: {
            subject: true,
            deflectionDetails: true,
            propertyPhotos: true,
          },
        });

        const { capacity, unavailableUnoccupied, unavailableOccupied, occupied, holds, available } = bedType;
        const updatedData = {
          capacity,
          unavailableUnoccupied,
          unavailableOccupied,
          occupied: occupied - 1,
          holds,
          available: available + 1,
          updateMethod: 'API',
          updatedById: request.user.id,
        };

        await tx.bedTypeUpdate.create({
          data: {
            ...updatedData,
            bedTypeId,
            facilityId: deflection.facilityId,
          },
        });

        await tx.bedType.update({
          where: { id: bedTypeId },
          data: updatedData,
        });
      });

      deflection.propertyPhotos = deflection.propertyPhotos.map(photo => new PropertyPhoto(photo));
      return reply.send(redactDeflectionForUser(deflection, request.user));
    }
  );
}
