import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const BedTypeUnavailableReasonAttributesSchema = z.object({
  description: z.string(),
});

const BedTypeUnavailableReasonCreateSchema = BedTypeUnavailableReasonAttributesSchema;

const BedTypeUnavailableReasonUpdateSchema = BedTypeUnavailableReasonAttributesSchema.partial();

const BedTypeUnavailableReasonResponseSchema = BedTypeUnavailableReasonAttributesSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export class BedTypeUnavailableReason extends Base {
  static CreateSchema = BedTypeUnavailableReasonCreateSchema;
  static UpdateSchema = BedTypeUnavailableReasonUpdateSchema;
  static ResponseSchema = BedTypeUnavailableReasonResponseSchema;

  constructor (data) {
    super(Prisma.BedTypeUnavailableReasonScalarFieldEnum, data);
  }
}

export default BedTypeUnavailableReason;
