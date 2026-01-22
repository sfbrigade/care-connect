import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const DeflectionExitHousingStatusAttributesSchema = z.object({
  name: z.string(),
});

const DeflectionExitHousingStatusCreateSchema = DeflectionExitHousingStatusAttributesSchema.extend({
  id: z.string(),
});

const DeflectionExitHousingStatusUpdateSchema = DeflectionExitHousingStatusAttributesSchema.partial();

const DeflectionExitHousingStatusResponseSchema = DeflectionExitHousingStatusCreateSchema;

export class DeflectionExitHousingStatus extends Base {
  static CreateSchema = DeflectionExitHousingStatusCreateSchema;
  static UpdateSchema = DeflectionExitHousingStatusUpdateSchema;
  static ResponseSchema = DeflectionExitHousingStatusResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionExitHousingStatusScalarFieldEnum, data);
  }
}

export default DeflectionExitHousingStatus;
