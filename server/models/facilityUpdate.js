import { Prisma, FacilityStatus, FacilityUpdateMethod } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import FacilityStatusReason from './facilityStatusReason.js';
import User from './user.js';

const FacilityUpdateAttributesSchema = z.object({
  status: z.enum(Object.values(FacilityStatus)),
  statusReasonId: z.string().nullable(),
  statusOther: z.string().nullable(),
  updateMethod: z.enum(Object.values(FacilityUpdateMethod)),
  updateNotes: z.string().nullable(),
});

const FacilityUpdateResponseSchema = FacilityUpdateAttributesSchema.extend({
  id: z.string().uuid(),
  statusReason: FacilityStatusReason.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
  updatedBy: User.ResponseSchema.optional(),
  updatedById: z.string().uuid(),
});

const FacilityUpdateUpdateSchema = FacilityUpdateAttributesSchema.partial();

export class FacilityUpdate extends Base {
  static ResponseSchema = FacilityUpdateResponseSchema;
  static UpdateSchema = FacilityUpdateUpdateSchema;

  constructor (data) {
    super(Prisma.FacilityUpdateScalarFieldEnum, data);
  }

  get baseURL () {
    const url = new URL(process.env.BASE_URL);
    url.hostname = `${this.subdomain}.${url.hostname}`;
    return url;
  }
}

export default FacilityUpdate;
