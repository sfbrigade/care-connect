import * as z from 'zod/mini';

const ERROR_REQUIRED = 'This field is required';
const ERROR_SELECT_ONE = 'Select one';
const ERROR_MIN_ALPHANUMERIC = 'Enter at least 2 letters or numbers';

function zodResolver (schema) {
  return (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return {};
    }

    return result.error.issues.reduce((errors, issue) => {
      const key = issue.path[0];

      if (typeof key === 'string' && !errors[key]) {
        errors[key] = issue.message;
      }

      return errors;
    }, {});
  };
}

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

const DeflectionSchema = z.object({
  subject: SubjectSchema,
  ...NarcoticsSchema.shape,
  ...DeflectionDetailsSchema.shape,
  ...PropertySchema.shape,
});

export const validateIncident = zodResolver(IncidentSchema);

export const isValidIncident = (obj) => {
  return !!IncidentSchema.safeParse(obj)?.success;
};

export const validateSubject = zodResolver(SubjectSchema);

export const isValidSubject = (obj) => {
  return !!SubjectSchema.safeParse(obj)?.success;
};

export const validateNarcotics = zodResolver(NarcoticsSchema);

export const isValidNarcotics = (obj) => {
  return !!NarcoticsSchema.safeParse(obj)?.success;
};

export const validateDeflectionDetails = zodResolver(DeflectionDetailsSchema);

export const isValidDeflectionDetails = (obj) => {
  return !!DeflectionDetailsSchema.safeParse(obj)?.success;
};

export const validateProperty = zodResolver(PropertySchema);

export const isValidProperty = (obj) => {
  return !!PropertySchema.safeParse(obj)?.success;
};

export const isValidDeflection = (obj) => {
  return !!DeflectionSchema.safeParse(obj)?.success;
};
