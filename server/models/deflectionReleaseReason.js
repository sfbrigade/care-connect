import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';
const { Prisma } = prismaPkg;

const DeflectionReleaseReasonAttributesSchema = z.object({
  name: z.string(),
});

const DeflectionReleaseReasonCreateSchema = DeflectionReleaseReasonAttributesSchema.extend({
  id: z.string(),
});

const DeflectionReleaseReasonUpdateSchema = DeflectionReleaseReasonAttributesSchema.partial();

const DeflectionReleaseReasonResponseSchema = DeflectionReleaseReasonCreateSchema.extend({
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
  updatedById: z.string().uuid(),
  updatedBy: User.ResponseSchema.optional(),
});

export class DeflectionReleaseReason extends Base {
  static CreateSchema = DeflectionReleaseReasonCreateSchema;
  static UpdateSchema = DeflectionReleaseReasonUpdateSchema;
  static ResponseSchema = DeflectionReleaseReasonResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionReleaseReasonScalarFieldEnum, data);
  }
}

export default DeflectionReleaseReason;
