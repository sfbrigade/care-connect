import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import Client from './client.js';
import Facility from './facility.js';
import ServiceType from './serviceType.js';
import User from './user.js';
import Incident from './incident.js';

const BedHoldAttributesSchema = z.object({
  incidentId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const BedHoldCreateSchema = BedHoldAttributesSchema.extend({
  facilityId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  clientId: z.string().uuid().nullable().optional(),
});

const BedHoldResponseSchema = BedHoldCreateSchema.extend({
  id: z.string().uuid(),
  expiresAt: z.coerce.date(),
  status: z.string(),
  createdById: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  cancelledById: z.string().uuid().nullable(),
  cancelledAt: z.coerce.date().nullable(),
  transferToken: z.string().nullable(),
  transferTokenExpiresAt: z.coerce.date().nullable(),
  transferredById: z.string().uuid().nullable(),
  transferredAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date(),
  client: Client.ResponseSchema.optional(),
  facility: Facility.ResponseSchema.optional(),
  serviceType: ServiceType.ResponseSchema.optional(),
  createdBy: User.ResponseSchema.optional(),
  cancelledBy: User.ResponseSchema.optional(),
  transferredBy: User.ResponseSchema.optional(),
  incident: Incident.ResponseSchema.optional(),
});

const BedHoldUpdateSchema = BedHoldAttributesSchema.partial();

export class BedHold extends Base {
  static ResponseSchema = BedHoldResponseSchema;
  static CreateSchema = BedHoldCreateSchema;
  static UpdateSchema = BedHoldUpdateSchema;

  constructor (data) {
    super(Prisma.BedHoldScalarFieldEnum, data);
  }
}

export default BedHold;
