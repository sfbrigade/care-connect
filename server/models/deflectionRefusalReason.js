import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const DeflectionRefusalReasonAttributesSchema = z.object({
  name: z.string(),
});

const DeflectionRefusalReasonCreateSchema = DeflectionRefusalReasonAttributesSchema.extend({
  id: z.string(),
});

const DeflectionRefusalReasonUpdateSchema = DeflectionRefusalReasonAttributesSchema.partial();

const DeflectionRefusalReasonResponseSchema = DeflectionRefusalReasonCreateSchema;

export class DeflectionRefusalReason extends Base {
  static CreateSchema = DeflectionRefusalReasonCreateSchema;
  static UpdateSchema = DeflectionRefusalReasonUpdateSchema;
  static ResponseSchema = DeflectionRefusalReasonResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionRefusalReasonScalarFieldEnum, data);
  }
}

export default DeflectionRefusalReason;
