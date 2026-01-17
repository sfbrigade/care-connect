import { Prisma, HoldStatusEnum, SubjectStatusEnum, TernaryEnum } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import BedType from './bedType.js';
import DeflectionCancelReason from './deflectionCancelReason.js';
import DeflectionExitDestination from './deflectionExitDestination.js';
import DeflectionExitHousingStatus from './deflectionExitHousingStatus.js';
import DeflectionRefusalReason from './deflectionRefusalReason.js';
import DeflectionReleaseReason from './deflectionReleaseReason.js';
import Facility from './facility.js';
import Incident from './incident.js';
import Organization from './organization.js';
import Subject from './subject.js';
import Title from './title.js';
import Unit from './unit.js';
import User from './user.js';

const DeflectionAttributesSchema = z.object({
  behavior: z.string().nullable(),
  releaseReasonId: z.string().nullable(),
  refusalReasonId: z.string().nullable(),
  exitDestinationId: z.string().nullable(),
  exitHousingStatusId: z.string().nullable(),
  exitConnectedToCare: z.enum(Object.values(TernaryEnum)).nullable(),
  exitSFResident: z.enum(Object.values(TernaryEnum)).nullable(),
});

const DeflectionCreateSchema = DeflectionAttributesSchema.partial().extend({
  facilityId: z.string().uuid(),
  incidentId: z.string().uuid(),
  bedTypeId: z.string().uuid(),
  subjectId: z.string().uuid().nullable().optional(),
});

const DeflectionUpdateSchema = DeflectionAttributesSchema.partial();

const DeflectionResponseSchema = DeflectionCreateSchema.extend({
  id: z.string().uuid(),
  facility: Facility.ResponseSchema.optional(),
  incident: Incident.ResponseSchema.optional(),
  bedType: BedType.ResponseSchema.optional(),
  subject: Subject.ResponseSchema.nullable().optional(),
  subjectStatus: z.enum(Object.values(SubjectStatusEnum)),
  status: z.enum(Object.values(HoldStatusEnum)),
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
  releaseReason: DeflectionReleaseReason.ResponseSchema.nullable().optional(),
  refusalReason: DeflectionRefusalReason.ResponseSchema.nullable().optional(),
  exitDestination: DeflectionExitDestination.ResponseSchema.nullable().optional(),
  exitHousingStatus: DeflectionExitHousingStatus.ResponseSchema.nullable().optional(),
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
