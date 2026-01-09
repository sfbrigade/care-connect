import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const UnitAttributesSchema = z.object({
  name: z.string(),
});

const UnitCreateSchema = UnitAttributesSchema.extend({
  id: z.string(),
  organizationId: z.string(),
});

const UnitUpdateSchema = UnitAttributesSchema.partial();

const UnitResponseSchema = UnitCreateSchema.extend({
  createdById: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export class Unit extends Base {
  static CreateSchema = UnitCreateSchema;
  static UpdateSchema = UnitUpdateSchema;
  static ResponseSchema = UnitResponseSchema;

  constructor (data) {
    super(Prisma.UnitScalarFieldEnum, data);
  }
}

export default Unit;
