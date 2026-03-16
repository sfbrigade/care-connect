import * as z from 'zod/mini';
import { DateTime } from 'luxon';

const isValidDateTimeValue = (value) => {
  if (typeof value === 'string') {
    return DateTime.fromISO(value).isValid;
  }

  if (value instanceof Date) {
    return DateTime.fromJSDate(value).isValid;
  }

  return false;
};

const IncidentSchema = z.object({
  addressLine1: z.string().check(z.minLength(2)),
  addressLine2: z.optional(z.nullable(z.string())),
  city: z.string().check(z.minLength(2)),
  state: z.string().check(z.minLength(2)),
  arrestedAt: z.custom(isValidDateTimeValue),
  encounteredVia: z.enum(['ON_VIEW', 'DISPATCHED']),
  cadNumber: z.string().check(z.minLength(2)),
  supervisorBadgeNumber: z.string().check(z.minLength(1), z.maxLength(4)),
});

const DeflectionSchema = z.object({
  subject: z.object({
    firstName: z.string().check(z.minLength(1)),
    lastName: z.string().check(z.minLength(1)),
    dateOfBirth: z.iso.datetime(),
    sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']),
    race: z.enum(['WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN']),
  }),
  narcoticsSubstance: z.boolean(),
  narcoticsParaphernalia: z.boolean(),
  deflectionDetails: z.array(z.object({})).check(z.minLength(1)),
  behavior: z.string().check(z.minLength(2)),
  property: z.enum(['NONE', 'SMALL', 'MEDIUM', 'LARGE']),
});

export const isValidIncident = (obj) => {
  return !!IncidentSchema.safeParse(obj)?.success;
};

export const isValidDeflection = (obj) => {
  return !!DeflectionSchema.safeParse(obj)?.success;
};
