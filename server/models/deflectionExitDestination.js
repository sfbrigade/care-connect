import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';

const DeflectionExitDestinationAttributesSchema = z.object({
  name: z.string(),
});

const DeflectionExitDestinationCreateSchema = DeflectionExitDestinationAttributesSchema.extend({
  id: z.string(),
});

const DeflectionExitDestinationUpdateSchema = DeflectionExitDestinationAttributesSchema.partial();

const DeflectionExitDestinationResponseSchema = DeflectionExitDestinationCreateSchema.extend({
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
  updatedById: z.string().uuid(),
  updatedBy: User.ResponseSchema.optional(),
});

export class DeflectionExitDestination extends Base {
  static CreateSchema = DeflectionExitDestinationCreateSchema;
  static UpdateSchema = DeflectionExitDestinationUpdateSchema;
  static ResponseSchema = DeflectionExitDestinationResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionExitDestinationScalarFieldEnum, data);
  }
}

export default DeflectionExitDestination;
