import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import Facility from './facility.js';
import Organization from './organization.js';
import Title from './title.js';
import Unit from './unit.js';
import User from './user.js';

const IncidentAttributesSchema = z.object({
  cadNumber: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  arrestedAt: z.coerce.date().nullable(),
  supervisorBadgeNumber: z.string().nullable(),
});

const IncidentCreateSchema = IncidentAttributesSchema.extend({
  facilityId: z.string().uuid(),
});

const IncidentUpdateSchema = IncidentAttributesSchema.partial();

const IncidentResponseSchema = IncidentCreateSchema.extend({
  id: z.string().uuid(),
  facility: Facility.ResponseSchema.optional(),
  arrivedAt: z.coerce.date().nullable(),
  leftAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  createdByOrganizationId: z.string().uuid().nullable(),
  createdByOrganization: Organization.ResponseSchema.nullable().optional(),
  createdByTitleId: z.string().uuid().nullable(),
  createdByTitle: Title.ResponseSchema.nullable().optional(),
  createdByUnitId: z.string().uuid().nullable(),
  createdByUnit: Unit.ResponseSchema.nullable().optional(),
  createdByBadgeNumber: z.string().nullable(),
  updatedById: z.string().uuid(),
  updatedBy: User.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
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
