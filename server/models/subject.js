import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
const { Prisma, DrugTypeEnum, SexEnum, RaceEnum, PreferredLanguageEnum } = prismaPkg;

export const PII_FIELDS = [
  'firstName',
  'lastName',
  'middleInitial',
  'dateOfBirth',
  'sex',
  'race',
  'driverLicense',
  'preferredLanguage',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postalCode',
  'localId',
];

const SubjectAttributesSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  middleInitial: z.string().nullable(),
  dateOfBirth: z.coerce.date().catch(null).nullable(),
  sex: z.enum(Object.values(SexEnum)).catch(null).nullable(),
  race: z.enum(Object.values(RaceEnum)).catch(null).nullable(),
  driverLicense: z.string().nullable(),
  preferredLanguage: z.enum(Object.values(PreferredLanguageEnum)).catch(null).nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  localId: z.string().nullable(),
  narcoticsSubstance: z.boolean().nullable().optional(),
  narcoticsParaphernalia: z.boolean().nullable().optional(),
  drugUseEvidence: z.boolean().nullable().optional(),
  drugType: z.enum(Object.values(DrugTypeEnum)).catch(null).nullable().optional(),
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
  static PreferredLanguage = PreferredLanguageEnum;

  constructor (data) {
    super(Prisma.SubjectScalarFieldEnum, data);
  }
}

export default Subject;
