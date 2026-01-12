import { Prisma, FacilityType } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const FacilityStatusReasonAttributesSchema = z.object({
  type: z.enum(Object.values(FacilityType)).nullable(),
  description: z.string().nullable(),
});

const FacilityStatusReasonCreateSchema = FacilityStatusReasonAttributesSchema.extend({
  id: z.string(),
});

const FacilityStatusReasonUpdateSchema = FacilityStatusReasonAttributesSchema.partial();

const FacilityStatusReasonResponseSchema = FacilityStatusReasonCreateSchema.extend({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export class FacilityStatusReason extends Base {
  static CreateSchema = FacilityStatusReasonCreateSchema;
  static UpdateSchema = FacilityStatusReasonUpdateSchema;
  static ResponseSchema = FacilityStatusReasonResponseSchema;

  constructor (data) {
    super(Prisma.FacilityStatusReasonScalarFieldEnum, data);
  }
}

export default FacilityStatusReason;
