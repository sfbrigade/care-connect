import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
const { Prisma, RoleEnum } = prismaPkg;

const OrganizationAttributesSchema = z.object({
  name: z.string(),
  defaultRoles: z.array(z.enum(Object.values(RoleEnum))).optional(),
});

const OrganizationCreateSchema = OrganizationAttributesSchema.extend({
  id: z.string(),
});

const OrganizationUpdateSchema = OrganizationAttributesSchema.partial();

const OrganizationResponseSchema = OrganizationCreateSchema.extend({
  createdById: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export class Organization extends Base {
  static CreateSchema = OrganizationCreateSchema;
  static UpdateSchema = OrganizationUpdateSchema;
  static ResponseSchema = OrganizationResponseSchema;

  constructor (data) {
    super(Prisma.OrganizationScalarFieldEnum, data);
  }
}

export default Organization;
