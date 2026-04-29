import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
const { Prisma } = prismaPkg;

const ServiceTypeAttributesSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
});

const ServiceTypeCreateSchema = ServiceTypeAttributesSchema.extend({
  id: z.string(),
});

const ServiceTypeUpdateSchema = ServiceTypeAttributesSchema.partial();

const ServiceTypeResponseSchema = ServiceTypeCreateSchema.extend({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export class ServiceType extends Base {
  static CreateSchema = ServiceTypeCreateSchema;
  static UpdateSchema = ServiceTypeUpdateSchema;
  static ResponseSchema = ServiceTypeResponseSchema;

  constructor (data) {
    super(Prisma.ServiceTypeScalarFieldEnum, data);
  }
}

export default ServiceType;
