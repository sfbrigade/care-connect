import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const FacilityContactAttributesSchema = z.object({
  facilityId: z.string().uuid(),
  name: z.string(),
  role: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  isPrimary: z.boolean(),
});

const FacilityContactResponseSchema = FacilityContactAttributesSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const FacilityContactUpdateSchema = FacilityContactAttributesSchema.partial();

export class FacilityContact extends Base {
  static ResponseSchema = FacilityContactResponseSchema;
  static UpdateSchema = FacilityContactUpdateSchema;

  constructor (data) {
    super(Prisma.FacilityContactScalarFieldEnum, data);
  }
}

export default FacilityContact;
