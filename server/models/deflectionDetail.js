import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';

const DeflectionDetailAttributesSchema = z.object({
  name: z.string(),
  deflectionDetailCategoryId: z.string(),
});

const DeflectionDetailCreateSchema = DeflectionDetailAttributesSchema.extend({
  id: z.string(),
});

const DeflectionDetailUpdateSchema = DeflectionDetailAttributesSchema.partial();

const DeflectionDetailResponseSchema = DeflectionDetailCreateSchema.extend({
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  deletedAt: z.coerce.date().optional().nullable(),
  deletedById: z.string().uuid().nullable(),
  updatedAt: z.coerce.date(),
  updatedById: z.string().uuid().nullable(),
  updatedBy: User.ResponseSchema.optional(),
});

export class DeflectionDetail extends Base {
  static CreateSchema = DeflectionDetailCreateSchema;
  static UpdateSchema = DeflectionDetailUpdateSchema;
  static ResponseSchema = DeflectionDetailResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionDetailScalarFieldEnum, data);
  }
}

export default DeflectionDetail;
