import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import Deflection from './deflection.js';
import Facility from './facility.js';
import Organization from './organization.js';
import Title from './title.js';
import Unit from './unit.js';
import User from './user.js';
const { Prisma } = prismaPkg;

const IncidentAttributesSchema = z.object({
  cadNumber: z.string().nullable(),
  caseNumber: z.string().nullable(),
  locationType: z.enum(['ADDRESS', 'INTERSECTION']).default('ADDRESS'),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  street1: z.string().nullable(),
  street2: z.string().nullable(),
  intersectionId: z.string().nullable(),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  arrestedAt: z.coerce.date().catch(null).nullable(),
  encounteredVia: z.enum(['ON_VIEW', 'DISPATCHED']).catch(null).nullable(),
  supervisorBadgeNumber: z.string().nullable(),
});

const IncidentCreateSchema = IncidentAttributesSchema.extend({
  facilityId: z.string().uuid(),
});

const IncidentUpdateSchema = IncidentAttributesSchema.partial();

const IncidentResponseSchema = IncidentCreateSchema.extend({
  id: z.number(),
  facility: Facility.ResponseSchema.optional(),
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  createdByOrganizationId: z.string().nullable(),
  createdByOrganization: Organization.ResponseSchema.nullable().optional(),
  createdByTitleId: z.string().nullable(),
  createdByTitle: Title.ResponseSchema.nullable().optional(),
  createdByUnitId: z.string().nullable(),
  createdByUnit: Unit.ResponseSchema.nullable().optional(),
  createdByBadgeNumber: z.string().nullable(),
  updatedById: z.string().uuid(),
  updatedBy: User.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
  deflections: z.array(Deflection.ResponseSchema).optional(),
});

export class Incident extends Base {
  static CreateSchema = IncidentCreateSchema;
  static UpdateSchema = IncidentUpdateSchema;
  static ResponseSchema = IncidentResponseSchema;

  constructor (data) {
    super(Prisma.IncidentScalarFieldEnum, data);
  }
}

export default Incident;
