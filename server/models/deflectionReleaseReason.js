import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const DeflectionReleaseReasonAttributesSchema = z.object({
  name: z.string(),
});

const DeflectionReleaseReasonCreateSchema = DeflectionReleaseReasonAttributesSchema.extend({
  id: z.string(),
});

const DeflectionReleaseReasonUpdateSchema = DeflectionReleaseReasonAttributesSchema.partial();

const DeflectionReleaseReasonResponseSchema = DeflectionReleaseReasonCreateSchema;

export class DeflectionReleaseReason extends Base {
  static CreateSchema = DeflectionReleaseReasonCreateSchema;
  static UpdateSchema = DeflectionReleaseReasonUpdateSchema;
  static ResponseSchema = DeflectionReleaseReasonResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionReleaseReasonScalarFieldEnum, data);
  }
}

export default DeflectionReleaseReason;
