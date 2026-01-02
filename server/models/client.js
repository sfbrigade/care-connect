import { Prisma } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const ClientAttributesSchema = z.object({
  firstName: z.string(),
  middleInitial: z.string().nullable(),
  lastName: z.string().nullable(),
  dateOfBirth: z.coerce.date().nullable(),
  sex: z.string().nullable(),
  race: z.string().nullable(),
  address: z.string().nullable(),
  driverLicense: z.string().nullable(),
  localId: z.string().nullable(),
  personallyIdentifiable: z.string().nullable(),
  description: z.string().nullable(),
  pets: z.string().nullable(),
  qualifications: z.object().nullable(),
  notes: z.string().nullable(),
});

const ClientResponseSchema = ClientAttributesSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const ClientUpdateSchema = ClientAttributesSchema.partial();

export class Client extends Base {
  static ResponseSchema = ClientResponseSchema;
  static UpdateSchema = ClientUpdateSchema;

  constructor (data) {
    super(Prisma.ClientScalarFieldEnum, data);
  }
}

export default Client;
