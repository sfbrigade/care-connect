import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';
import DeflectionDetail from './deflectionDetail.js';

const DeflectionDetailCategoryAttributesSchema = z.object({
  name: z.string(),
});

const DeflectionDetailCategoryCreateSchema = DeflectionDetailCategoryAttributesSchema.extend({
  id: z.string(),
});

const DeflectionDetailCategoryUpdateSchema = DeflectionDetailCategoryAttributesSchema.partial();

const DeflectionDetailCategoryResponseSchema = DeflectionDetailCategoryCreateSchema.extend({
  deflectionDetails: z.array(DeflectionDetail.ResponseSchema).optional(),
  deletedAt: z.coerce.date().optional().nullable(),
  deletedById: z.string().uuid().optional().nullable(),
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
  updatedById: z.string().uuid().nullable(),
  updatedBy: User.ResponseSchema.optional(),
});

export class DeflectionDetailCategory extends Base {
  static CreateSchema = DeflectionDetailCategoryCreateSchema;
  static UpdateSchema = DeflectionDetailCategoryUpdateSchema;
  static ResponseSchema = DeflectionDetailCategoryResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionDetailCategoryScalarFieldEnum, data);
  }
}

export default DeflectionDetailCategory;
