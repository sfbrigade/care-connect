import { Prisma, FacilityEligibilityType } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const FacilityEligibilityAttributesSchema = z.object({
  facilityId: z.string().uuid(),
  type: z.enum(Object.values(FacilityEligibilityType)),
  value: z.string().nullable(),
  notes: z.string().nullable(),
});

const FacilityEligibilityResponseSchema = FacilityEligibilityAttributesSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const FacilityEligibilityUpdateSchema = FacilityEligibilityAttributesSchema.partial();

export class FacilityEligibility extends Base {
  static ResponseSchema = FacilityEligibilityResponseSchema;
  static UpdateSchema = FacilityEligibilityUpdateSchema;

  constructor(data) {
    super(Prisma.FacilityEligibilityScalarFieldEnum, data);
  }
}

export default FacilityEligibility;
