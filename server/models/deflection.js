import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import DeflectionDocument from './deflectionDocument.js';
import Organization from './organization.js';
import PropertyPhoto from './propertyPhoto.js';
import Subject from './subject.js';
import Title from './title.js';
import Unit from './unit.js';
import User from './user.js';
const {
  Prisma,
  DrugTypeEnum,
  ChargeTypeEnum,
  HoldStatusEnum,
  PropertyEnum,
  PropertyNotReturnedReasonEnum,
  SFResidentEnum,
  SubjectStatusEnum,
  TernaryEnum,
  DeflectionCancelReasonEnum,
  DeflectionReleaseReasonEnum,
  DeflectionRefusalReasonEnum,
  DeflectionExitDestinationEnum,
  DeflectionExitTransportationEnum,
  DeflectionExitHousingStatusEnum,
} = prismaPkg;

const DeflectionAttributesSchema = z.object({
  behavior: z.string().nullable(),
  behaviorNarrative: z.string().nullable(),
  chargeType: z.enum(Object.values(ChargeTypeEnum)).catch(null).nullable(),
  certifiedAt: z.coerce.date().nullable(),
  narcoticsSubstance: z.boolean().nullable(),
  narcoticsParaphernalia: z.boolean().nullable(),
  drugUseEvidence: z.boolean().nullable(),
  drugType: z.enum(Object.values(DrugTypeEnum)).catch(null).nullable(),
  property: z.enum(Object.values(PropertyEnum)).catch(null).nullable(),
  propertyDetails: z.string().nullable(),
  releaseNarrative: z.string().nullable(),
});

const DeflectionCreateSchema = DeflectionAttributesSchema.partial().extend({
  facilityId: z.string().uuid(),
  incidentId: z.coerce.number(),
  bedTypeId: z.string().uuid(),
  subjectId: z.string().uuid().nullable().optional(),
});

const DeflectionUpdateSchema = DeflectionAttributesSchema.partial();

const DeflectionUpdateResponseSchema = z.object({
  id: z.string().uuid(),
  deflectionId: z.number(),
  status: z.enum(Object.values(HoldStatusEnum)).nullable().optional(),
  subjectStatus: z.enum(Object.values(SubjectStatusEnum)).nullable().optional(),
  releaseReason: z.enum(Object.values(DeflectionReleaseReasonEnum)).nullable().optional(),
  exitDestination: z.enum(Object.values(DeflectionExitDestinationEnum)).nullable().optional(),
  updatedAt: z.coerce.date(),
  updatedById: z.string().uuid(),
  updatedBy: User.NameResponseSchema.optional(),
});

const DeflectionResponseSchema = DeflectionCreateSchema.extend({
  id: z.number(),
  status: z.enum(Object.values(HoldStatusEnum)),
  subject: Subject.ResponseSchema.nullable().optional(),
  incident: z.object({
    id: z.number(),
    addressLine1: z.string().nullable(),
    addressLine2: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postalCode: z.string().nullable(),
    latitude: z.coerce.number().nullable(),
    longitude: z.coerce.number().nullable(),
    arrestedAt: z.coerce.date().catch(null).nullable(),
    encounteredVia: z.enum(['ON_VIEW', 'DISPATCHED']).catch(null).nullable(),
    cadNumber: z.string().nullable(),
    caseNumber: z.string().nullable(),
    supervisorBadgeNumber: z.string().nullable(),
    createdById: z.string().uuid(),
    createdAt: z.coerce.date(),
  }).optional(),
  subjectStatus: z.enum(Object.values(SubjectStatusEnum)),
  deflectionDocuments: z.array(DeflectionDocument.ResponseSchema).optional(),
  deflectionUpdates: z.array(DeflectionUpdateResponseSchema).optional(),
  propertyPhotos: z.array(PropertyPhoto.ResponseSchema).optional(),
  propertyReturned: z.boolean().nullable().optional(),
  propertyNotReturnedReason: z.string().nullable().optional(),
  propertyNotReturnedOtherReason: z.string().nullable().optional(),
  propertyReturnedAt: z.coerce.date().nullable().optional(),
  propertyReturnedById: z.string().uuid().nullable().optional(),
  certifiedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  arrivedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  extensionCount: z.number().int().min(0),
  cancelReason: z.enum(Object.values(DeflectionCancelReasonEnum)).nullable(),
  cancelledAt: z.coerce.date().nullable(),
  cancelledById: z.string().uuid().nullable(),
  cancelledBy: User.NameResponseSchema.nullable().optional(),
  transferredAt: z.coerce.date().nullable(),
  transferredById: z.string().uuid().nullable(),
  transferredBy: User.NameResponseSchema.nullable().optional(),
  transferredByBadgeNumber: z.string().nullable(),
  transferredByProp115Certified: z.boolean().nullable(),
  transferredByOrganizationId: z.string().nullable(),
  transferredByOrganization: Organization.ResponseSchema.nullable().optional(),
  transferredByUnitId: z.string().nullable(),
  transferredByUnit: Unit.ResponseSchema.nullable().optional(),
  transferredByTitleId: z.string().nullable(),
  transferredByTitle: Title.ResponseSchema.nullable().optional(),
  medicalIntakeStartedAt: z.coerce.date().nullable(),
  medicalIntakeStartedById: z.string().uuid().nullable(),
  medicalIntakeStartedBy: User.NameResponseSchema.nullable().optional(),
  rejectedAt: z.coerce.date().nullable(),
  rejectedById: z.string().uuid().nullable(),
  rejectedBy: User.NameResponseSchema.nullable().optional(),
  releasedAt: z.coerce.date().nullable(),
  releasedById: z.string().uuid().nullable(),
  releasedBy: User.NameResponseSchema.nullable().optional(),
  releaseReason: z.enum(Object.values(DeflectionReleaseReasonEnum)).nullable(),
  otherReleaseReason: z.string().nullable().optional(),
  otherReleaseDestination: z.string().nullable().optional(),
  refusalReason: z.enum(Object.values(DeflectionRefusalReasonEnum)).nullable(),
  exitedAt: z.coerce.date().nullable(),
  exitedById: z.string().uuid().nullable(),
  exitedBy: User.NameResponseSchema.nullable().optional(),
  exitDestination: z.enum(Object.values(DeflectionExitDestinationEnum)).nullable(),
  exitTransportation: z.enum(Object.values(DeflectionExitTransportationEnum)).nullable(),
  exitHousingStatus: z.enum(Object.values(DeflectionExitHousingStatusEnum)).nullable(),
  exitConnectedToCare: z.enum(Object.values(TernaryEnum)).nullable(),
  exitSFResident: z.enum(Object.values(SFResidentEnum)).nullable(),
  currentOfficerId: z.string().uuid().nullable().optional(),
  currentOfficer: User.ResponseSchema.nullable().optional(),
  createdById: z.string().uuid(),
  createdBy: User.NameResponseSchema.optional(),
  updatedAt: z.coerce.date(),
  wasHandedOffByMe: z.boolean().optional(),
});

export class Deflection extends Base {
  static CreateSchema = DeflectionCreateSchema;
  static UpdateSchema = DeflectionUpdateSchema;
  static ResponseSchema = DeflectionResponseSchema;

  static HoldStatus = HoldStatusEnum;
  static SubjectStatus = SubjectStatusEnum;
  static Ternary = TernaryEnum;
  static SFResident = SFResidentEnum;
  static PropertyNotReturnedReason = PropertyNotReturnedReasonEnum;

  constructor (data) {
    super(Prisma.DeflectionScalarFieldEnum, data);
  }
}

export default Deflection;
