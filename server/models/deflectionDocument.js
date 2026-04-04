import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';

const DeflectionDocumentAttributesSchema = z.object({
  formId: z.string(),
  file: z.string().nullable(),
});

const DeflectionDocumentCreateSchema = DeflectionDocumentAttributesSchema.extend({
  deflectionId: z.coerce.number(),
});

const DeflectionDocumentResponseSchema = DeflectionDocumentCreateSchema.extend({
  id: z.string().uuid(),
  fileUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
  updatedById: z.string().uuid(),
  updatedBy: User.ResponseSchema.optional(),
});

export class DeflectionDocument extends Base {
  static CreateSchema = DeflectionDocumentCreateSchema;
  static ResponseSchema = DeflectionDocumentResponseSchema;

  constructor (data) {
    super(Prisma.DeflectionDocumentScalarFieldEnum, data);
  }

  get fileUrl () {
    return this.getAssetUrl('file');
  }
}

export default DeflectionDocument;
