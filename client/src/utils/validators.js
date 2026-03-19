import * as z from 'zod/mini';

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
  subject: z.object({
    firstName: z.string().check(z.minLength(1)),
    lastName: z.string().check(z.minLength(1)),
    dateOfBirth: z.iso.datetime(),
    sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']),
    race: z.enum(['WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN']),
  }),
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
  ...SubjectSchema.shape,
  ...NarcoticsSchema.shape,
  ...DeflectionDetailsSchema.shape,
  ...PropertySchema.shape,
});

export const isValidIncident = (obj) => {
  return !!IncidentSchema.safeParse(obj)?.success;
};

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
