import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';
const { Prisma } = prismaPkg;

const DeflectionCancelReasonAttributesSchema = z.object({
  name: z.string(),
});

const DeflectionCancelReasonCreateSchema = DeflectionCancelReasonAttributesSchema.extend({
  id: z.string(),
});

const DeflectionCancelReasonUpdateSchema = DeflectionCancelReasonAttributesSchema.partial();

const DeflectionCancelReasonResponseSchema = DeflectionCancelReasonCreateSchema.extend({
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
  updatedById: z.string().uuid(),
  updatedBy: User.ResponseSchema.optional(),
});

export class DeflectionCancelReason extends Base {
  static CreateSchema = DeflectionCancelReasonCreateSchema;
  static UpdateSchema = DeflectionCancelReasonUpdateSchema;
  static ResponseSchema = DeflectionCancelReasonResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionCancelReasonScalarFieldEnum, data);
  }
}

export default DeflectionCancelReason;
