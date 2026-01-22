import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const DeflectionExitDestinationAttributesSchema = z.object({
  name: z.string(),
});

const DeflectionExitDestinationCreateSchema = DeflectionExitDestinationAttributesSchema.extend({
  id: z.string(),
});

const DeflectionExitDestinationUpdateSchema = DeflectionExitDestinationAttributesSchema.partial();

const DeflectionExitDestinationResponseSchema = DeflectionExitDestinationCreateSchema;

export class DeflectionExitDestination extends Base {
  static CreateSchema = DeflectionExitDestinationCreateSchema;
  static UpdateSchema = DeflectionExitDestinationUpdateSchema;
  static ResponseSchema = DeflectionExitDestinationResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionExitDestinationScalarFieldEnum, data);
  }
}

export default DeflectionExitDestination;
