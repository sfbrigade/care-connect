import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';
const { Prisma, FacilityStatusEnum, FacilityStatusReasonEnum, FacilityUpdateMethodEnum } = prismaPkg;

const FacilityUpdateAttributesSchema = z.object({
  status: z.enum(Object.values(FacilityStatusEnum)),
  statusReason: z.enum(Object.values(FacilityStatusReasonEnum)).nullable().optional(),
  statusOther: z.string().nullable().optional(),
  updateNotes: z.string().nullable().optional(),
});

const FacilityUpdateResponseSchema = FacilityUpdateAttributesSchema.extend({
  id: z.string().uuid(),
  updateMethod: z.enum(Object.values(FacilityUpdateMethodEnum)),
  updatedAt: z.coerce.date(),
  updatedBy: User.ResponseSchema.optional(),
  updatedById: z.string().uuid(),
});

const FacilityUpdateCreateSchema = FacilityUpdateAttributesSchema;

export class FacilityUpdate extends Base {
  static ResponseSchema = FacilityUpdateResponseSchema;
  static CreateSchema = FacilityUpdateCreateSchema;

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
