import { zod4Resolver } from 'mantine-form-zod-resolver';
import { DateTime } from 'luxon';
import * as z from 'zod/mini';

import { CHARGE_TYPE_OPTIONS } from '../lesc/constants/chargeTypeOptions';
import { DRUG_TYPE_OPTIONS } from '../lesc/constants/drugTypeOptions';

const ERROR_REQUIRED = 'This field is required';
const ERROR_SELECT_ONE = 'Select one';
const ERROR_MIN_ALPHANUMERIC = 'Enter at least 2 letters or numbers';
const ERROR_DOB_INVALID = 'Enter a valid date as MM/DD/YYYY';

// Two-digit years below this pivot expand to 20YY; at or above, to 19YY.
const TWO_DIGIT_YEAR_PIVOT = 30;

function hasMinimumAlphanumericChars (value, minimum) {
  const alphanumericCount = String(value ?? '').match(/[0-9a-z]/gi)?.length ?? 0;
  return alphanumericCount >= minimum;
}

export function normalizeDobInput (value) {
  const trimmed = String(value ?? '').trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!match) return trimmed;
  const [, mm, dd, yy] = match;
  const century = parseInt(yy, 10) < TWO_DIGIT_YEAR_PIVOT ? '20' : '19';
  return `${mm}/${dd}/${century}${yy}`;
}

function isValidDobValue (value) {
  if (!value) return true;

  const normalized = normalizeDobInput(value);
  return (
    DateTime.fromFormat(normalized, 'MM/dd/yyyy').isValid ||
    DateTime.fromISO(String(value), { setZone: true }).isValid
  );
}

const IncidentCommonShape = {
  arrestedAt: z.iso.datetime(ERROR_REQUIRED),
  encounteredVia: z.enum(['ON_VIEW', 'DISPATCHED'], ERROR_SELECT_ONE),
  cadNumber: z.string(ERROR_REQUIRED).check(z.refine((value) => hasMinimumAlphanumericChars(value, 2), ERROR_MIN_ALPHANUMERIC)),
  caseNumber: z.string(ERROR_REQUIRED).check(z.refine((value) => hasMinimumAlphanumericChars(value, 2), ERROR_MIN_ALPHANUMERIC)),
  supervisorBadgeNumber: z.string(ERROR_REQUIRED).check(z.minLength(1, ERROR_REQUIRED), z.maxLength(4, ERROR_REQUIRED)),
};

const IncidentSchema = z.discriminatedUnion('locationType', [
  z.object({
    locationType: z.literal('ADDRESS'),
    addressLine1: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
    addressLine2: z.optional(z.nullable(z.string())),
    city: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
    state: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
    ...IncidentCommonShape,
  }),
  z.object({
    locationType: z.literal('INTERSECTION'),
    street1: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
    street2: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
    city: z.optional(z.nullable(z.string())),
    intersectionId: z.optional(z.nullable(z.string())),
    ...IncidentCommonShape,
  }),
], ERROR_SELECT_ONE);

const SEX_OPTIONS = ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'];
const RACE_OPTIONS = ['WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN'];

const SubjectSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string().check(
    z.refine(
      (value) => isValidDobValue(value),
      ERROR_DOB_INVALID
    )
  ),
  sex: z.string().check(
    z.refine((value) => !value || SEX_OPTIONS.includes(value), ERROR_SELECT_ONE)
  ),
  race: z.string().check(
    z.refine((value) => !value || RACE_OPTIONS.includes(value), ERROR_SELECT_ONE)
  ),
});

const DrugTypeSchema = z.enum(DRUG_TYPE_OPTIONS, ERROR_SELECT_ONE);
const ChargeTypeSchema = z.enum(CHARGE_TYPE_OPTIONS, ERROR_SELECT_ONE);

const NarcoticsSchema = z.object({
  narcoticsSubstance: z.boolean(ERROR_SELECT_ONE),
  narcoticsParaphernalia: z.boolean(ERROR_SELECT_ONE),
});

const BehaviorSchema = z.object({
  behavior: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
  behaviorNarrative: z.string(ERROR_REQUIRED).check(z.minLength(2, ERROR_REQUIRED)),
  chargeType: ChargeTypeSchema,
});

const PropertySchema = z.object({
  property: z.enum(['NONE', 'SMALL', 'MEDIUM', 'LARGE'], ERROR_SELECT_ONE),
});

const CertificationSchema = z.object({
  certifiedAt: z.iso.datetime(ERROR_REQUIRED),
});

const DeflectionSchema = z.discriminatedUnion('drugUseEvidence', [
  z.object({
    subject: SubjectSchema,
    ...NarcoticsSchema.shape,
    drugUseEvidence: z.literal(false),
    drugType: z.nullable(z.optional(DrugTypeSchema)),
    ...BehaviorSchema.shape,
    ...PropertySchema.shape,
    ...CertificationSchema.shape,
  }),
  z.object({
    subject: SubjectSchema,
    ...NarcoticsSchema.shape,
    drugUseEvidence: z.literal(true),
    drugType: DrugTypeSchema,
    ...BehaviorSchema.shape,
    ...PropertySchema.shape,
    ...CertificationSchema.shape,
  }),
], ERROR_SELECT_ONE);

// Records from the API or older fixtures may lack locationType; default it
// to ADDRESS so the discriminated union can branch.
function withLocationTypeDefault (obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return obj.locationType ? obj : { ...obj, locationType: 'ADDRESS' };
}

export const validateIncident = zod4Resolver(IncidentSchema);

export const isValidIncident = (obj) => {
  return !!IncidentSchema.safeParse(withLocationTypeDefault(obj))?.success;
};

export const validateSubject = zod4Resolver(SubjectSchema);

export const isValidSubject = (obj) => {
  return !!SubjectSchema.safeParse(obj)?.success;
};

export const validateNarcotics = zod4Resolver(NarcoticsSchema);

export const isValidNarcotics = (obj) => {
  return !!NarcoticsSchema.safeParse(obj)?.success;
};

export const validateSubstance = (values = {}) => {
  const errors = {};

  if (typeof values.narcoticsSubstance !== 'boolean') {
    errors.narcoticsSubstance = ERROR_SELECT_ONE;
  }

  if (typeof values.narcoticsParaphernalia !== 'boolean') {
    errors.narcoticsParaphernalia = ERROR_SELECT_ONE;
  }

  if (typeof values.drugUseEvidence !== 'boolean') {
    errors.drugUseEvidence = ERROR_SELECT_ONE;
  }

  if (values.drugUseEvidence === true && !DrugTypeSchema.safeParse(values.drugType)?.success) {
    errors.drugType = ERROR_SELECT_ONE;
  }

  return errors;
};

export const isValidSubstance = (obj) => {
  return Object.keys(validateSubstance(obj)).length === 0;
};

export const validateBehavior = zod4Resolver(BehaviorSchema);

export const isValidBehavior = (obj) => {
  return !!BehaviorSchema.safeParse(obj)?.success;
};

export const validateProperty = zod4Resolver(PropertySchema);

export const isValidProperty = (obj) => {
  return !!PropertySchema.safeParse(obj)?.success;
};

export const isValidCertification = (obj) => {
  return !!CertificationSchema.safeParse(obj)?.success;
};

export const isValidDeflection = (obj) => {
  return !!DeflectionSchema.safeParse(obj)?.success;
};
