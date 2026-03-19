import { zod4Resolver } from 'mantine-form-zod-resolver';
import * as z from 'zod/mini';

const ERROR_REQUIRED = 'This field is required';
const ERROR_SELECT_ONE = 'Select one';

const IncidentSchema = z.object({
  addressLine1: z.string().check(z.minLength(2)),
  addressLine2: z.optional(z.nullable(z.string())),
  city: z.string().check(z.minLength(2)),
  state: z.string().check(z.minLength(2)),
  arrestedAt: z.iso.datetime(),
  encounteredVia: z.enum(['ON_VIEW', 'DISPATCHED']),
  cadNumber: z.string().check(z.minLength(2)),
  supervisorBadgeNumber: z.string().check(z.minLength(1), z.maxLength(4)),
});

const SubjectSchema = z.object({
  firstName: z.string(ERROR_REQUIRED).check(z.minLength(1, ERROR_REQUIRED)),
  lastName: z.string(ERROR_REQUIRED).check(z.minLength(1, ERROR_REQUIRED)),
  dateOfBirth: z.iso.datetime(ERROR_REQUIRED),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'], ERROR_SELECT_ONE),
  race: z.enum(['WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN'], ERROR_SELECT_ONE),
});

const NarcoticsSchema = z.object({
  narcoticsSubstance: z.boolean(),
  narcoticsParaphernalia: z.boolean(),
});

const DeflectionDetailsSchema = z.object({
  deflectionDetails: z.array(z.object({})).check(z.minLength(1)),
  behavior: z.string().check(z.minLength(2)),
});

const PropertySchema = z.object({
  property: z.enum(['NONE', 'SMALL', 'MEDIUM', 'LARGE']),
});

const DeflectionSchema = z.object({
  subject: SubjectSchema,
  ...NarcoticsSchema.shape,
  ...DeflectionDetailsSchema.shape,
  ...PropertySchema.shape,
});

export const isValidIncident = (obj) => {
  return !!IncidentSchema.safeParse(obj)?.success;
};

export const validateSubject = zod4Resolver(SubjectSchema);

export const isValidSubject = (obj) => {
  return !!SubjectSchema.safeParse(obj)?.success;
};

export const isValidNarcotics = (obj) => {
  return !!NarcoticsSchema.safeParse(obj)?.success;
};

export const isValidDeflectionDetails = (obj) => {
  return !!DeflectionDetailsSchema.safeParse(obj)?.success;
};

export const isValidProperty = (obj) => {
  return !!PropertySchema.safeParse(obj)?.success;
};

export const isValidDeflection = (obj) => {
  return !!DeflectionSchema.safeParse(obj)?.success;
};
