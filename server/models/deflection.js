import { Prisma, HoldStatusEnum, PropertyEnum, SubjectStatusEnum, TernaryEnum } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import DeflectionCancelReason from './deflectionCancelReason.js';
import DeflectionDetail from './deflectionDetail.js';
import DeflectionExitDestination from './deflectionExitDestination.js';
import DeflectionExitHousingStatus from './deflectionExitHousingStatus.js';
import DeflectionRefusalReason from './deflectionRefusalReason.js';
import DeflectionReleaseReason from './deflectionReleaseReason.js';
import Organization from './organization.js';
import PropertyPhoto from './propertyPhoto.js';
import Subject from './subject.js';
import Title from './title.js';
import Unit from './unit.js';
import User from './user.js';

const DeflectionAttributesSchema = z.object({
  behavior: z.string().nullable(),
  narcoticsSubstance: z.boolean().nullable(),
  narcoticsParaphernalia: z.boolean().nullable(),
  property: z.enum(Object.values(PropertyEnum)).nullable(),
  propertyDetails: z.string().nullable(),
  deflectionDetails: z.array(z.string()),
});

const DeflectionCreateSchema = DeflectionAttributesSchema.partial().extend({
  facilityId: z.string().uuid(),
  incidentId: z.coerce.number(),
  bedTypeId: z.string().uuid(),
  subjectId: z.string().uuid().nullable().optional(),
});

const DeflectionUpdateSchema = DeflectionAttributesSchema.partial();

const DeflectionResponseSchema = DeflectionCreateSchema.extend({
  id: z.number(),
  status: z.enum(Object.values(HoldStatusEnum)),
  subject: Subject.ResponseSchema.nullable().optional(),
  subjectStatus: z.enum(Object.values(SubjectStatusEnum)),
  deflectionDetails: z.array(DeflectionDetail.ResponseSchema).optional(),
  propertyPhotos: z.array(PropertyPhoto.ResponseSchema).optional(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  extensionCount: z.number().int().min(0),
  cancelReasonId: z.string().nullable(),
  cancelledAt: z.coerce.date().nullable(),
  transferredAt: z.coerce.date().nullable(),
  transferredByBadgeNumber: z.string().nullable(),
  transferredByProp115Certified: z.boolean().nullable(),
  transferredByOrganizationId: z.string().nullable(),
  transferredByUnitId: z.string().nullable(),
  transferredByTitleId: z.string().nullable(),
  admittedAt: z.coerce.date().nullable(),
  rejectedAt: z.coerce.date().nullable(),
  releasedAt: z.coerce.date().nullable(),
  exitedAt: z.coerce.date().nullable(),
  exitedBy: User.ResponseSchema.nullable().optional(),
  exitedById: z.string().uuid().nullable(),
  completedAt: z.coerce.date().nullable(),
  cancelReason: DeflectionCancelReason.ResponseSchema.nullable().optional(),
  cancelledById: z.string().uuid().nullable(),
  cancelledBy: User.ResponseSchema.nullable().optional(),
  transferredById: z.string().uuid().nullable(),
  transferredBy: User.ResponseSchema.nullable().optional(),
  transferredByOrganization: Organization.ResponseSchema.nullable().optional(),
  transferredByUnit: Unit.ResponseSchema.nullable().optional(),
  transferredByTitle: Title.ResponseSchema.nullable().optional(),
  admittedById: z.string().uuid().nullable(),
  admittedBy: User.ResponseSchema.nullable().optional(),
  rejectedById: z.string().uuid().nullable(),
  rejectedBy: User.ResponseSchema.nullable().optional(),
  releasedById: z.string().uuid().nullable(),
  releasedBy: User.ResponseSchema.nullable().optional(),
  releaseReasonId: z.string().nullable(),
  releaseReason: DeflectionReleaseReason.ResponseSchema.nullable().optional(),
  refusalReasonId: z.string().nullable(),
  refusalReason: DeflectionRefusalReason.ResponseSchema.nullable().optional(),
  exitDestinationId: z.string().nullable(),
  exitDestination: DeflectionExitDestination.ResponseSchema.nullable().optional(),
  exitHousingStatusId: z.string().nullable(),
  exitHousingStatus: DeflectionExitHousingStatus.ResponseSchema.nullable().optional(),
  exitConnectedToCare: z.enum(Object.values(TernaryEnum)).nullable(),
  exitSFResident: z.enum(Object.values(TernaryEnum)).nullable(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
});

export class Deflection extends Base {
  static CreateSchema = DeflectionCreateSchema;
  static UpdateSchema = DeflectionUpdateSchema;
  static ResponseSchema = DeflectionResponseSchema;

  static HoldStatus = HoldStatusEnum;
  static SubjectStatus = SubjectStatusEnum;
  static Ternary = TernaryEnum;

  constructor (data) {
    super(Prisma.DeflectionScalarFieldEnum, data);
  }
}

export default Deflection;
