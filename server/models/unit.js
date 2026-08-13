import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import { formatUnitName } from '#lib/unitName.js';
const { Prisma } = prismaPkg;

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
    // Same guard as User: the spread below would drop every field of an
    // already-wrapped model, since a Base proxy has no own enumerable keys.
    if (data instanceof Unit) {
      data = data.toJSON();
    }
    if (data?.name) {
      data = {
        ...data,
        name: formatUnitName(data.name),
      };
    }
    super(Prisma.UnitScalarFieldEnum, data);
  }
}

export default Unit;
