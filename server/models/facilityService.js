import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import ServiceType from './serviceType.js';

const FacilityServiceAttributesSchema = z.object({
  availableBeds: z.number(),
  reservedBeds: z.number(),
  description: z.string().nullable(),
});

const FacilityServiceResponseSchema = FacilityServiceAttributesSchema.extend({
  facilityId: z.string().uuid(),
  serviceTypeId: z.string(),
  serviceType: ServiceType.ResponseSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const FacilityServiceUpdateSchema = FacilityServiceAttributesSchema.partial();

export class FacilityService extends Base {
  static ResponseSchema = FacilityServiceResponseSchema;
  static UpdateSchema = FacilityServiceUpdateSchema;

  constructor (data) {
    super(Prisma.FacilityServiceScalarFieldEnum, data);
  }
}

export default FacilityService;
