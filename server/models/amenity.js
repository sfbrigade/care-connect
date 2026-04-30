import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
const { Prisma } = prismaPkg;

const AmenityAttributesSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
});

const AmenityResponseSchema = AmenityAttributesSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const AmenityUpdateSchema = AmenityAttributesSchema.partial();

export class Amenity extends Base {
  static ResponseSchema = AmenityResponseSchema;
  static UpdateSchema = AmenityUpdateSchema;

  constructor (data) {
    super(Prisma.AmenityScalarFieldEnum, data);
  }
}

export default Amenity;
