import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
const { Prisma } = prismaPkg;

const TitleAttributesSchema = z.object({
  name: z.string(),
});

const TitleCreateSchema = TitleAttributesSchema.extend({
  id: z.string(),
  organizationId: z.string(),
});

const TitleUpdateSchema = TitleAttributesSchema.partial();

const TitleResponseSchema = TitleCreateSchema.extend({
  createdById: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export class Title extends Base {
  static CreateSchema = TitleCreateSchema;
  static UpdateSchema = TitleUpdateSchema;
  static ResponseSchema = TitleResponseSchema;

  constructor (data) {
    super(Prisma.TitleScalarFieldEnum, data);
  }
}

export default Title;
