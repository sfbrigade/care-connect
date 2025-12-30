import { Prisma, FacilityType, FacilityUpdateMethod } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const FacilityAttributesSchema = z.object({
  name: z.string(),
  type: z.enum(Object.values(FacilityType)),
  subdomain: z.string().nullable(),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  neighborhood: z.string().nullable(),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  isActive: z.boolean(),
  updateMethod: z.enum(Object.values(FacilityUpdateMethod)),
  updateNotes: z.string().nullable(),
});

const FacilityResponseSchema = FacilityAttributesSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const FacilityUpdateSchema = FacilityAttributesSchema.partial();

export class Facility extends Base {
  static ResponseSchema = FacilityResponseSchema;
  static UpdateSchema = FacilityUpdateSchema;

  constructor (data) {
    super(Prisma.FacilityScalarFieldEnum, data);
  }
}

export default Facility;
