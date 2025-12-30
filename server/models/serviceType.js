import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const ServiceTypeAttributesSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

const ServiceTypeResponseSchema = ServiceTypeAttributesSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const ServiceTypeUpdateSchema = ServiceTypeAttributesSchema.partial();

export class ServiceType extends Base {
  static ResponseSchema = ServiceTypeResponseSchema;
  static UpdateSchema = ServiceTypeUpdateSchema;

  constructor(data) {
    super(Prisma.ServiceTypeScalarFieldEnum, data);
  }
}

export default ServiceType;
