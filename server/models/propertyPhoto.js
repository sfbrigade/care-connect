import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import User from './user.js';

const PropertyPhotoAttributesSchema = z.object({
  file: z.string().nullable()
});

const PropertyPhotoCreateSchema = PropertyPhotoAttributesSchema.extend({
  deflectionId: z.number(),
});

const PropertyPhotoResponseSchema = PropertyPhotoCreateSchema.extend({
  id: z.string().uuid(),
  fileUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  createdBy: User.ResponseSchema.optional(),
  updatedAt: z.coerce.date(),
  updatedById: z.string().uuid(),
  updatedBy: User.ResponseSchema.optional(),
});

export class PropertyPhoto extends Base {
  static CreateSchema = PropertyPhotoCreateSchema;
  static ResponseSchema = PropertyPhotoResponseSchema;

  constructor (data) {
    super(Prisma.PropertyPhotoScalarFieldEnum, data);
  }

  get fileUrl () {
    return this.getAssetUrl('file');
  }
}

export default PropertyPhoto;
