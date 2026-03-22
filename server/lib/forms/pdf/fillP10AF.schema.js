/* eslint-disable @stylistic/key-spacing */
import { z } from 'zod';

// ── Reusable primitives ──────────────────────────────────────────────────────

const optStr = z.string().optional();
const optBool = z.boolean().optional();
const optNullBool = z.boolean().nullable().optional(); // true=YES, false=NO, null=N/A

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const PersonSchema = z.object({
  /** A-ADVISED; B-BOOKED; C-CITED; D-DETAINED; E-EXONERATED; SB-SUBJECT; SU-SUSPECT; M-MISSING; F-FOUND */
  code:             optStr,
  /** Last, First, Middle */
  name:             optStr,
  race:             optStr,
  sex:              optStr,
  /** Date of birth. Combined with `age` as "dob / age" if both supplied. */
  dob:              optStr,
  /** Age. Combined with `dob` as "dob / age" if both supplied. */
  age:              z.union([z.string(), z.number()]).optional(),
  height:           optStr,
  weight:           z.union([z.string(), z.number()]).optional(),
  hair:             optStr,
  eyes:             optStr,
  residenceAddress: optStr,
  residenceZip:     z.string().max(5).optional(),
  contactPhone:     optStr,
  businessAddress:  optStr,
  businessZip:      z.string().max(5).optional(),
  businessPhone:    optStr,
  email:            z.email().optional(),
});

const SubjectSchema = PersonSchema.extend({
  knownAlias: optStr,
  /** ID No (SOC.SEC / OP.LIC / FBI / CII) */
  idNumber:   optStr,
  sfNumber:   optStr,
});

const ReportingPartySchema = PersonSchema.extend({
  /** ID No (SOC.SEC / OP.LIC / FBI / CII) */
  idNumber:              optStr,
  /** SFX Number */
  sfxNumber:             optStr,
  relationshipToSubject: optStr,
});

const BookingSchema = z.object({
  /** Up to 4 booking charges */
  charges:                z.array(z.string()).max(4).optional(),
  whereBooked:            optStr,
  warrant:                optStr,
  court:                  optStr,
  action:                 optStr,
  deptEnRouteTo:          optStr,
  /** CRU Check (Name/Star) */
  cruCheck:               optStr,
  warrantViolations:      optStr,
  /** ADD'L - SEE NARRATIVE checkbox (warrant violations row) */
  addlWarrants:           optBool,
  bail:                   optStr,
  /** MIRANDIZED — true=YES, false=NO */
  mirandized:             optBool,
  mirandizedStar:         z.string().max(4).optional(),
  /** STATEMENT — true=YES, false=NO */
  statement:              optBool,
  citation:               optStr,
  citationViolations:     optStr,
  appearanceDateTime:     optStr,
  appearanceLocation:     optStr,
  addlCharges:            optBool,
  addlCiteSections:       optBool,
  /** BOOKING APPROVED BY checkbox */
  bookingApproved:        optBool,
  /** ADD'L WARRANTS (SEE NARRATIVE) checkbox */
  addlWarrantsSeeNarrative: optBool,
  /** CITATION checkbox */
  citationIssued:         optBool,
  /** SDCS ENTRY — true=Y, false=N */
  sdcsEntry:              optBool,
  /** XRAYS — true=Y, false=N */
  xrays:                  optBool,
  mac:                    optStr,
  /** ADD'L SUBJ — true=Y, false=N */
  addlSubjects:           optBool,
});

// ── Root schema ──────────────────────────────────────────────────────────────

export const P10AFSchema = z.object({

  // ── Header ────────────────────────────────────────────────────────────────
  incidentNumber:    z.string().max(9).optional(),
  cadNumber:         z.string().max(9).optional(),
  relatedCaseNumber: optStr,
  /** Total pages shown on both pages of the form. Defaults to 2 if omitted. */
  totalPages:        z.union([z.string(), z.number()]).optional(),

  // ── Incident Classification ────────────────────────────────────────────────
  arrestMade:        optBool,
  /** SUSPECT/SUBJECT status — checks exactly one of KNOWN / UNKNOWN / NON-SUSPECT checkboxes */
  suspectStatus:     z.enum(['known', 'unknown', 'nonSuspect']).optional(),
  primaryIncidentType: optStr,
  /** Checks INITIAL or SUPP */
  reportType:        z.enum(['initial', 'supplemental']).optional(),
  occurrenceDateTime: optStr,
  reportedDateTime:   optStr,
  additionalIncidentTypes: optStr,
  /** ADD'L – SEE NARRATIVE checkbox (additional incident types row) */
  addlTypesSeeNarrative: optBool,
  /** Up to 3 incident codes (max 5 chars each) */
  incidentCodes:     z.array(z.string().max(5)).max(3).optional(),
  /** ADD'L CODES SEE NARRATIVE checkbox */
  addlCodesSeeNarrative: optBool,
  location:          optStr,
  premiseType:       optStr,
  /** LOCATION SENT TO dropdown */
  locationSentTo:    z.enum(['Same', 'Same/On View', 'Other']).optional(),
  /** Reported to SFSO CRU/CIU/SOC/SFPD OPS (Name/Star/Date/Time) */
  reportedTo:        optStr,
  /** DV INCIDENT checkbox */
  dvIncident:        optBool,
  /** DV INCIDENT (WPN USED) text field */
  dvWeaponUsed:      optStr,
  elderAbuse:        optBool,
  gangRelated:       optBool,
  juvenileRelated:   optBool,
  prejudiceBased:    optBool,

  // ── Declaration ───────────────────────────────────────────────────────────
  /** "I DECLARE UNDER PENALTY OF PERJURY…" / PROP 115 CERTIFIED checkbox */
  prop115Certified:  optBool,
  /** PROP 115 CERTIFIED — years (max 2 chars) */
  prop115Years:      z.string().max(2).optional(),
  /** POST TRAINING checkbox */
  postTraining:      optBool,

  // ── Reporting Deputy ──────────────────────────────────────────────────────
  reportingDeputy:   optStr,
  /** Star # (max 4 chars) */
  star:              z.string().max(4).optional(),
  divisionUnit:      optStr,
  supervisorApproval: optStr,
  watch:             optStr,
  assignTo:          optStr,
  assignedBy:        optStr,
  copiesTo:          optStr,
  /** DISPOSITION CODE dropdown */
  dispositionCode:   z.enum([
    'ADV', 'ARR/F', 'ARR/M', 'ARR/W',
    'CIT/F', 'CIT/M', 'CIT/I',
    'DET/5150', 'DET/REL',
    'REP/ADM', 'REP/CIV', 'REP/CRM', 'REP/OTH',
  ]).optional(),
  /** Pages in declaration */
  prop115Pages:      optStr,

  // ── Subject Information ───────────────────────────────────────────────────
  subject:           SubjectSchema.optional(),

  // ── Booking ───────────────────────────────────────────────────────────────
  booking:           BookingSchema.optional(),

  /** OTHER INFORMATION: Citation/Warrant/Booking Charges/Missing Person/Subject Last Seen Wearing/School Name/# */
  subjectOtherInfo:  optStr,

  // ── Reporting Party Information ───────────────────────────────────────────
  reportingParty:    ReportingPartySchema.optional(),

  // ── Victim Notifications ──────────────────────────────────────────────────
  /** 293 PC NOTIFICATION — true=YES, false=NO, null=N/A */
  pcNotification:           optNullBool,
  /** CONFIDENTIALITY REQUESTED — true=YES, false=NO */
  confidentialityRequested: optBool,
  victimNotificationStar:   z.string().max(4).optional(),
  /** VICTIM OF CRIME NOTIFICATION — true=YES, false=NO, null=N/A */
  victimCrimeNotification:  optNullBool,
  victimCrimeNotificationStar: z.string().max(4).optional(),
  /** FOLLOW UP FORM — true=YES, false=NO */
  followUpForm:             optBool,
  /** STATEMENT (reporting party) — true=YES, false=NO */
  rpStatement:              optBool,
  extentOfInjury:           optStr,
  /** ADD'L RP'S — true=Y, false=N */
  addlReportingParties:     optBool,
  /** OTHER INFORMATION: Subject Last Seen Wearing/Employment/Activity at Time of Incident */
  rpOtherInfo:              optStr,

  // ── Narrative (page 2) ────────────────────────────────────────────────────
  narrative:         optStr,

}).strict();

/** @typedef {z.infer<typeof P10AFSchema>} P10AData */
