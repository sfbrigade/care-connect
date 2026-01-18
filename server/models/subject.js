import { Prisma, SexEnum, RaceEnum } from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';

const SubjectAttributesSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  middleInitial: z.string().nullable(),
  dateOfBirth: z.coerce.date().catch(null).nullable(),
  sex: z.enum(Object.values(SexEnum)).catch(null).nullable(),
  race: z.enum(Object.values(RaceEnum)).catch(null).nullable(),
  driverLicense: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  localId: z.string().nullable(),
});

const SubjectCreateSchema = SubjectAttributesSchema;

const SubjectUpdateSchema = SubjectAttributesSchema.partial();

const SubjectResponseSchema = SubjectAttributesSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export class Subject extends Base {
  static CreateSchema = SubjectCreateSchema;
  static UpdateSchema = SubjectUpdateSchema;
  static ResponseSchema = SubjectResponseSchema;

  static Sex = SexEnum;
  static Race = RaceEnum;

  constructor (data) {
    super(Prisma.SubjectScalarFieldEnum, data);
  }
}

export default Subject;
