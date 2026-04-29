import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';
const { Prisma } = prismaPkg;

const DeflectionExitHousingStatusAttributesSchema = z.object({
  name: z.string(),
});

const DeflectionExitHousingStatusCreateSchema = DeflectionExitHousingStatusAttributesSchema.extend({
  id: z.string(),
});

const DeflectionExitHousingStatusUpdateSchema = DeflectionExitHousingStatusAttributesSchema.partial();

const DeflectionExitHousingStatusResponseSchema = DeflectionExitHousingStatusCreateSchema.extend({
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
  updatedById: z.string().uuid(),
  updatedBy: User.ResponseSchema.optional(),
});

export class DeflectionExitHousingStatus extends Base {
  static CreateSchema = DeflectionExitHousingStatusCreateSchema;
  static UpdateSchema = DeflectionExitHousingStatusUpdateSchema;
  static ResponseSchema = DeflectionExitHousingStatusResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionExitHousingStatusScalarFieldEnum, data);
  }
}

export default DeflectionExitHousingStatus;
