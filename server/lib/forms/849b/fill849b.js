/* eslint-disable @stylistic/key-spacing */
/**
 * fill849b.js
 *
 * Clean interface for filling SFSO 849(b) Report (Incident Report Header + Narrative).
 * Takes a plain JS object with camelCase keys and produces filled PDF bytes.
 *
 * Usage:
 *   import { fill849b } from './fill849b.js';
 *   const filledBytes = await fill849b(templatePdfBytes, data);
 */

import { PDFDocument, PDFName, PDFBool } from 'pdf-lib';

// ═══════════════════════════════════════════════════════════════════
//  1:1 TEXT FIELD MAPPINGS  { camelCaseKey → pdfFieldName }
// ═══════════════════════════════════════════════════════════════════

const TEXT = {
  // Header
  incidentNumber:          'INCIDENT NUMBER',
  cadNumber:               'CAD NUMBER',
  relatedCaseNumber:       'RELATED CASE NUMBER',
  totalPages:              'Text2',    // shared across both pages (widgetCount: 2)

  // Incident
  primaryIncidentType:     'PRIMARY INCIDENT TYPE',
  occurrenceDateTime:      'DATETIME OF OCCURRENCE',
  reportedDateTime:        'DATETIME REPORTED TO SFSO',
  additionalIncidentTypes: 'ADDITIONAL INCIDENT TYPES DDL  SEE NARRATIVE',
  location:                'LOCATION OF OCCURRENCE',
  premiseType:             'TYPE OF PREMISE',
  reportedTo:              'REPORTED TO SFSO CRUCIUSOCSFPD OPS NAMESTARDATETIME',
  dvWeaponUsed:            'DV INCIDENT WPN USED',

  // Declaration
  prop115Years:            'Text3',

  // Deputy
  reportingDeputy:         'REPORTING DEPUTY PRINT',
  star:                    'STAR',
  divisionUnit:            'SFSO DIVISIONUNITIDENTIFIER',
  supervisorApproval:      'SUPERVISOR APPROVING REPORT PRINT NAMESTAR',
  watch:                   'WATCH',
  assignTo:                'ASSIGN TO',
  assignedBy:              'ASSIGNED BY INITALSSTAR',
  copiesTo:                'COPIES TO DDL UNITSGENCIES',

  // Subject
  'subject.code':             'CODE',
  'subject.name':             'NAME LAST FIRST MIDDLE',
  'subject.race':             'RACE',
  'subject.sex':              'SEX',
  'subject.height':           'HEIGHT',
  'subject.weight':           'WEIGHT',
  'subject.hair':             'HAIR',
  'subject.eyes':             'EYES',
  'subject.residenceAddress': 'RESIDENCE ADDRESSCITY IF NOT SAN FRANCISCO',
  'subject.residenceZip':     'ZIP CODE',
  'subject.contactPhone':     'CONTACT PHONE NUMBER',
  'subject.businessAddress':  'BUSINESS ADDRESSNAME OF SCHOOL IF JUVENILECITY IF NOT SAN FRANCISCO',
  'subject.businessZip':      'ZIP CODE_2',
  'subject.businessPhone':    'BUSINESS PHONE',
  'subject.email':            'EMAIL',
  'subject.knownAlias':       'KNOWN ALIAS',
  'subject.idNumber':         'ID NO SOCSECOPLICFBICII',
  'subject.sfNumber':         'SF NUMBER',

  // Booking
  'booking.whereBooked':       'WHERE BOOKED',
  'booking.warrant':           'WARRANT',
  'booking.court':             'COURT',
  'booking.action':            'ACTION',
  'booking.deptEnRouteTo':     'DEPTENROUTE TO',
  'booking.cruCheck':          'CRU CHECK NAMESTAR',
  'booking.warrantViolations': 'WARRANT VIOLATIONS',
  'booking.bail':              'BAIL',
  'booking.mirandizedStar':    'STAR_2',
  'booking.citation':          'CITATION',
  'booking.citationViolations':'CITATION VIOLATIONS',
  'booking.appearanceDateTime':'DATETIME OF APPEARANCE',
  'booking.appearanceLocation':'LOCATION OF APPEARANCE',
  'booking.mac':               'MAC',

  // Subject other info
  subjectOtherInfo: 'OTHER INFORMATION CITATIONWARRANTBOOKING CHARGESMISSING PERSONSUBJECT LAST SEEN WEARING',

  // Reporting party
  'reportingParty.code':             'CODE_2',
  'reportingParty.name':             'NAME LAST FIRST MIDDLE_2',
  'reportingParty.race':             'RACE_2',
  'reportingParty.sex':              'SEX_2',
  'reportingParty.height':           'HEIGHT_2',
  'reportingParty.weight':           'WEIGHT_2',
  'reportingParty.hair':             'HAIR_2',
  'reportingParty.eyes':             'EYES_2',
  'reportingParty.residenceAddress': 'RESIDENCE ADDRESSCITY IF NOT SAN FRANCISCO_2',
  'reportingParty.residenceZip':     'ZIP CODE_3',
  'reportingParty.contactPhone':     'CONTACT PHONE NUMBER_2',
  'reportingParty.businessAddress':  'BUSINESS ADDRESSNAME OF SCHOOL IF JUVENILECITY IF NOT SAN FRANCISCO_2',
  'reportingParty.businessZip':      'ZIP CODE_4',
  'reportingParty.businessPhone':    'BUSINESS PHONE_2',
  'reportingParty.email':            'EMAIL_2',
  'reportingParty.idNumber':         'ID NO SOC SECOP LICFBICII',
  'reportingParty.sfxNumber':        'SFX NUMBER',
  'reportingParty.relationshipToSubject': 'RELATIONSHIP TO SUBJECT',

  // Victim notifications
  victimNotificationStar:      'STAR_3',
  victimCrimeNotificationStar: 'STAR_4',
  extentOfInjury:              'EXTENT OF INJURYTREATMENT',
  rpOtherInfo:                 'OTHER INFORMATION SUBJECT LAST SEEN WEARINGEMPLOYMENTACTIVITY AT TIME OF INCIDENT',

  // Narrative (page 2)
  narrative:                   'PAGE',
};

// ═══════════════════════════════════════════════════════════════════
//  1:1 CHECKBOX MAPPINGS  { camelCaseKey → pdfFieldName }
// ═══════════════════════════════════════════════════════════════════

const CHECKBOX = {
  arrestMade:                'ARREST MADE',
  addlTypesSeeNarrative:     'undefined',       // ADD'L – SEE NARRATIVE (incident types)
  addlCodesSeeNarrative:     'DDL CODES',        // ADD'L CODES SEE NARRATIVE
  dvIncident:                'undefined_2',      // DV INCIDENT (WPN USED) checkbox
  elderAbuse:                'undefined_3',      // ELDER ABUSE
  gangRelated:               'GANG',
  juvenileRelated:           'JUVENILE',
  prejudiceBased:            'PREJUDICE',
  prop115Certified:          'BELIEF FOLLOWING AN INVESTIGATION OF THE EVENTS AND PARTIES INVOLVED',
  postTraining:              'POST TRAINING',

  // Booking
  'booking.addlWarrants':            'ADD\'L WARRANTS',       // ADD'L - SEE NARRATIVE (warrant row)
  'booking.addlCharges':             'ADDL CHARGES',
  'booking.addlCiteSections':        'ADDL CITE SECTIONS',
  'booking.bookingApproved':         'BOOKING APPROVED BY PRINT NAMESTAR',
  'booking.addlWarrantsSeeNarrative':'ADDL WARRANTS SEE NARRATIVE',
  'booking.citationIssued':          'CITATION_2',
};

// ═══════════════════════════════════════════════════════════════════
//  DROPDOWN MAPPINGS  { camelCaseKey → pdfFieldName }
// ═══════════════════════════════════════════════════════════════════

const DROPDOWN = {
  locationSentTo:   'Dropdown2',   // 'Same' | 'Same/On View' | 'Other'
  dispositionCode:  'Dropdown4',   // 'ADV' | 'ARR/F' | 'ARR/M' | etc.
};

// ═══════════════════════════════════════════════════════════════════
//  BOOLEAN-PAIR MAPPINGS
//  Two checkboxes that represent a single boolean value.
//  { camelCaseKey → [yesField, noField] }
// ═══════════════════════════════════════════════════════════════════

const BOOLEAN_PAIR = {
  'booking.mirandized':      ['MIRANDIZED YES', 'MIRANDIZED NO'],
  'booking.sdcsEntry':       ['sdcs yes', 'sdcs no'],
  'booking.xrays':           ['Y', 'N'],
  'booking.addlSubjects':    ['Y_2', 'N_2'],
  addlReportingParties:      ['Y_3', 'N_3'],
};

// ═══════════════════════════════════════════════════════════════════
//  RADIO GROUP MAPPINGS
//  { camelCaseKey → { field, yes, no, na? } }
//  Value: true → yes, false → no, null → na (if available)
// ═══════════════════════════════════════════════════════════════════

const RADIO = {
  'booking.statement':       { field: 'STATEMENT', yes: 'YES_2', no: 'NO_2' },
  pcNotification:            { field: '293 PC NOTIFICATION', yes: 'YES_3', no: 'NO_3', na: 'NA' },
  confidentialityRequested:  { field: 'CONFIDENTIALITY REQUESTED', yes: 'YES_4', no: 'NO_4' },
  victimCrimeNotification:   { field: 'VICTIM OF CRIME NOTIFICATION', yes: 'YES_5', no: 'NO_5', na: 'NA_2' },
  followUpForm:              { field: 'FOLLOW UP FORM', yes: 'YES_6', no: 'NO_6' },
  rpStatement:               { field: 'STATEMENT_2', yes: 'YES_7', no: 'NO_7' },
};

// ═══════════════════════════════════════════════════════════════════
//  ENUM CHECKBOX MAPPINGS
//  A string value selects exactly one checkbox from a group.
//  { camelCaseKey → { 'value': 'PDF_FIELD', ... } }
// ═══════════════════════════════════════════════════════════════════

const ENUM_CHECKBOX = {
  suspectStatus: {
    known:      'KNOWN',
    unknown:    'UNKNOWN',
    nonSuspect: 'NONSUSPECTSUBJECT INCIDENT',
  },
  reportType: {
    initial:      'INITIAL',
    supplemental: 'SUPP',
  },
};

// ═══════════════════════════════════════════════════════════════════
//  ARRAY FIELD MAPPINGS
//  An array of values mapped to numbered PDF fields.
//  { camelCaseKey → ['FIELD_1', 'FIELD_2', ...] }
// ═══════════════════════════════════════════════════════════════════

const ARRAY = {
  incidentCodes:    ['INCIDENT CODE 1', 'INCIDENT CODE 2', 'INCIDENT CODE 3'],
  'booking.charges':['BOOKING SECTIONCHARGE 1', 'BOOKING SECTIONCHARGE 2',
    'BOOKING SECTIONCHARGE 3', 'BOOKING SECTIONCHARGE 4'],
};

// ═══════════════════════════════════════════════════════════════════
//  COMPOSITE FIELD TRANSFORMS
//  Fields that combine multiple data keys into one PDF field.
// ═══════════════════════════════════════════════════════════════════

function applyDobAge (form, pdfField, data, prefix) {
  const dob = get(data, `${prefix}.dob`);
  const age = get(data, `${prefix}.age`);
  if (dob == null && age == null) return;

  let value;
  if (dob && age) value = `${dob} / ${age}`;
  else value = dob || age;

  setTextField(form, pdfField, value);
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Resolve a dot-path like 'booking.warrant' against a nested object. */
function get (obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setTextField (form, pdfField, value) {
  const field = form.getTextField(pdfField);
  const text = String(value);
  const maxLength = field.getMaxLength();
  field.setText(maxLength == null ? text : text.slice(0, maxLength));
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN FILL FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Fill a 849(b) PDF template with the given data.
 *
 * @param {Uint8Array|Buffer} pdfBytes  Raw bytes of Form849b.pdf template.
 * @param {object}            data      Data object (see README / JSDoc below).
 * @returns {Promise<Uint8Array>}       Filled PDF bytes, ready to write.
 */
export async function fill849b (pdfBytes, data) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // ── Text fields ──
  for (const [key, pdfField] of Object.entries(TEXT)) {
    const val = get(data, key);
    if (val != null && val !== '') {
      setTextField(form, pdfField, val);
    }
  }

  // ── Page numbers (always 1 and 2) and totalPages default ──
  setTextField(form, 'Text1', '1');
  setTextField(form, 'Text1_2', '2');
  if (get(data, 'totalPages') == null) {
    setTextField(form, 'Text2', '2');
  }

  // ── Checkboxes ──
  for (const [key, pdfField] of Object.entries(CHECKBOX)) {
    const val = get(data, key);
    if (val === true) form.getCheckBox(pdfField).check();
    else if (val === false) form.getCheckBox(pdfField).uncheck();
  }

  // ── Dropdowns ──
  for (const [key, pdfField] of Object.entries(DROPDOWN)) {
    const val = get(data, key);
    if (val != null) form.getDropdown(pdfField).select(val);
  }

  // ── Boolean pairs (two checkboxes → one boolean) ──
  for (const [key, [yesField, noField]] of Object.entries(BOOLEAN_PAIR)) {
    const val = get(data, key);
    if (val === true) { form.getCheckBox(yesField).check(); form.getCheckBox(noField).uncheck(); }
    if (val === false) { form.getCheckBox(yesField).uncheck(); form.getCheckBox(noField).check(); }
  }

  // ── Radio groups ──
  for (const [key, { field, yes, no, na }] of Object.entries(RADIO)) {
    const val = get(data, key);
    if (val === true) form.getRadioGroup(field).select(yes);
    else if (val === false) form.getRadioGroup(field).select(no);
    else if (val === null && na) form.getRadioGroup(field).select(na);
  }

  // ── Enum checkboxes ──
  for (const [key, mapping] of Object.entries(ENUM_CHECKBOX)) {
    const val = get(data, key);
    if (val != null) {
      // Uncheck all options, then check the selected one
      for (const pdfField of Object.values(mapping)) {
        form.getCheckBox(pdfField).uncheck();
      }
      const target = mapping[val];
      if (target) form.getCheckBox(target).check();
    }
  }

  // ── Array fields ──
  for (const [key, pdfFields] of Object.entries(ARRAY)) {
    const arr = get(data, key);
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < pdfFields.length; i++) {
      const val = arr[i];
      if (val != null && val !== '') {
        setTextField(form, pdfFields[i], val);
      }
    }
  }

  // ── Composite: DOB/AGE ──
  applyDobAge(form, 'DOBAGE', data, 'subject');
  applyDobAge(form, 'DOBAGE_2', data, 'reportingParty');

  // ── Preserve the form's native fonts: let the viewer render appearances ──
  const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'));
  acroForm.set(PDFName.of('NeedAppearances'), PDFBool.True);

  return pdfDoc.save({ updateFieldAppearances: false });
}
