import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const DeflectionCancelReasonAttributesSchema = z.object({
  name: z.string(),
});

const DeflectionCancelReasonCreateSchema = DeflectionCancelReasonAttributesSchema.extend({
  id: z.string(),
});

const DeflectionCancelReasonUpdateSchema = DeflectionCancelReasonAttributesSchema.partial();

const DeflectionCancelReasonResponseSchema = DeflectionCancelReasonCreateSchema;

export class DeflectionCancelReason extends Base {
  static CreateSchema = DeflectionCancelReasonCreateSchema;
  static UpdateSchema = DeflectionCancelReasonUpdateSchema;
  static ResponseSchema = DeflectionCancelReasonResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionCancelReasonScalarFieldEnum, data);
  }
}

export default DeflectionCancelReason;
