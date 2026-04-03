import { zod4Resolver } from 'mantine-form-zod-resolver';
import * as z from 'zod/mini';

import { DRUG_TYPE_OPTIONS } from '../lesc/constants/drugTypeOptions';

const ERROR_REQUIRED = 'This field is required';
const ERROR_SELECT_ONE = 'Select one';
const ERROR_MIN_ALPHANUMERIC = 'Enter at least 2 letters or numbers';

function hasMinimumAlphanumericChars (value, minimum) {
  const alphanumericCount = String(value ?? '').match(/[0-9a-z]/gi)?.length ?? 0;
  return alphanumericCount >= minimum;
}

const IncidentSchema = z.object({
  addressLine1: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
  addressLine2: z.optional(z.nullable(z.string())),
  city: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
  state: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
  arrestedAt: z.iso.datetime(ERROR_REQUIRED),
  encounteredVia: z.enum(['ON_VIEW', 'DISPATCHED'], ERROR_SELECT_ONE),
  cadNumber: z.string(ERROR_REQUIRED).check(z.refine((value) => hasMinimumAlphanumericChars(value, 2), ERROR_MIN_ALPHANUMERIC)),
  caseNumber: z.string(ERROR_REQUIRED).check(z.refine((value) => hasMinimumAlphanumericChars(value, 2), ERROR_MIN_ALPHANUMERIC)),
  supervisorBadgeNumber: z.string(ERROR_REQUIRED).check(z.minLength(1, ERROR_REQUIRED), z.maxLength(4, ERROR_REQUIRED)),
});

const SubjectSchema = z.object({
  firstName: z.string(ERROR_REQUIRED).check(z.minLength(1, ERROR_REQUIRED)),
  lastName: z.string(ERROR_REQUIRED).check(z.minLength(1, ERROR_REQUIRED)),
  dateOfBirth: z.iso.datetime(ERROR_REQUIRED),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'], ERROR_SELECT_ONE),
  race: z.enum(['WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN'], ERROR_SELECT_ONE),
});

const DrugTypeSchema = z.enum(DRUG_TYPE_OPTIONS, ERROR_SELECT_ONE);

const DrugUseSchema = z.union([
  z.object({
    drugUseEvidence: z.literal(false),
    drugType: z.nullable(z.optional(DrugTypeSchema)),
  }),
  z.object({
    drugUseEvidence: z.literal(true),
    drugType: DrugTypeSchema,
  }),
], ERROR_SELECT_ONE);

const NarcoticsSchema = z.object({
  narcoticsSubstance: z.boolean(ERROR_SELECT_ONE),
  narcoticsParaphernalia: z.boolean(ERROR_SELECT_ONE),
});

const DeflectionDetailsSchema = z.object({
  deflectionDetails: z.array(z.object({})).check(z.minLength(1, ERROR_SELECT_ONE)),
  behavior: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
});

const PropertySchema = z.object({
  property: z.enum(['NONE', 'SMALL', 'MEDIUM', 'LARGE'], ERROR_SELECT_ONE),
});

const SubjectDetailsSchema = z.union([
  z.object({
    ...SubjectSchema.shape,
    drugUseEvidence: z.literal(false),
    drugType: z.nullable(z.optional(DrugTypeSchema)),
  }),
  z.object({
    ...SubjectSchema.shape,
    drugUseEvidence: z.literal(true),
    drugType: DrugTypeSchema,
  }),
], ERROR_SELECT_ONE);

const DeflectionSchema = z.union([
  z.object({
    subject: SubjectSchema,
    ...NarcoticsSchema.shape,
    drugUseEvidence: z.literal(false),
    drugType: z.nullable(z.optional(DrugTypeSchema)),
    ...DeflectionDetailsSchema.shape,
    ...PropertySchema.shape,
  }),
  z.object({
    subject: SubjectSchema,
    ...NarcoticsSchema.shape,
    drugUseEvidence: z.literal(true),
    drugType: DrugTypeSchema,
    ...DeflectionDetailsSchema.shape,
    ...PropertySchema.shape,
  }),
], ERROR_SELECT_ONE);

export const isValidDrugUse = (obj) => {
  return !!DrugUseSchema.safeParse(obj)?.success;
};

export const validateIncident = zod4Resolver(IncidentSchema);

export const isValidIncident = (obj) => {
  return !!IncidentSchema.safeParse(obj)?.success;
};

export const validateSubject = zod4Resolver(SubjectSchema);

export const isValidSubject = (obj) => {
  return !!SubjectSchema.safeParse(obj)?.success;
};

export const validateSubjectDetails = zod4Resolver(SubjectDetailsSchema);

export const isValidSubjectDetails = (obj) => {
  return !!SubjectDetailsSchema.safeParse(obj)?.success;
};

export const validateNarcotics = zod4Resolver(NarcoticsSchema);

export const isValidNarcotics = (obj) => {
  return !!NarcoticsSchema.safeParse(obj)?.success;
};

export const validateDeflectionDetails = zod4Resolver(DeflectionDetailsSchema);

export const isValidDeflectionDetails = (obj) => {
  return !!DeflectionDetailsSchema.safeParse(obj)?.success;
};

export const validateProperty = zod4Resolver(PropertySchema);

export const isValidProperty = (obj) => {
  return !!PropertySchema.safeParse(obj)?.success;
};

export const isValidDeflection = (obj) => {
  return !!DeflectionSchema.safeParse(obj)?.success;
};
