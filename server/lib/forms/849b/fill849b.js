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

import { PDFName } from 'pdf-lib';
import { fillPdf } from '#lib/forms/shared/fillPdf.js';

// The INCIDENT NUMBER / CAD NUMBER header fields are comb (one-char-per-box)
// fields. pdf-lib auto-fits comb fields to the box (~23pt) and ignores the DA
// font size, so the digits print too large. We render our own appearance for
// these fields at a fixed size, one glyph centered per box, in a post-bake
// finalize hook (updateFieldAppearances would otherwise overwrite it).
const CASE_NUMBER_BOX_FONT_SIZE = 14;
const HELVETICA_CAP_HEIGHT = 0.717; // cap height as a fraction of the font size
const COMB_FIELDS = ['INCIDENT NUMBER', 'CAD NUMBER'];

function setCombFieldAppearance (form, pdfDoc, font, fieldName) {
  const field = form.getTextField(fieldName);
  const text = field.getText();
  if (!text) return;

  const cellCount = field.getMaxLength() || text.length;
  const size = CASE_NUMBER_BOX_FONT_SIZE;

  // INCIDENT NUMBER / CAD NUMBER each appear on both page 1 and page 2 as
  // separate widgets of the same field. Render the fixed-size appearance for
  // every widget, not just the first — otherwise page 2 keeps pdf-lib's
  // oversized comb auto-fit.
  for (const widget of field.acroField.getWidgets()) {
    const { width, height } = widget.getRectangle();
    const cellWidth = width / cellCount;
    const baselineY = (height - size * HELVETICA_CAP_HEIGHT) / 2;

    let ops = `/Tx BMC\nq\nBT\n/Helv ${size} Tf\n0 g\n`;
    for (let i = 0; i < text.length && i < cellCount; i++) {
      const ch = text[i];
      const charWidth = font.widthOfTextAtSize(ch, size);
      const x = i * cellWidth + (cellWidth - charWidth) / 2;
      const escaped = ch.replace(/([\\()])/g, '\\$1');
      ops += `1 0 0 1 ${x.toFixed(2)} ${baselineY.toFixed(2)} Tm (${escaped}) Tj\n`;
    }
    ops += 'ET\nQ\nEMC';

    const stream = pdfDoc.context.stream(ops, {
      Type: 'XObject',
      Subtype: 'Form',
      FormType: 1,
      BBox: [0, 0, width, height],
      Resources: { Font: { Helv: font.ref } },
    });
    widget.dict.set(
      PDFName.of('AP'),
      pdfDoc.context.obj({ N: pdfDoc.context.register(stream) })
    );
  }
}

const spec = {
  text: {
    // Header
    incidentNumber:          'INCIDENT NUMBER',
    cadNumber:               'CAD NUMBER',
    relatedCaseNumber:       'RELATED CASE NUMBER',
    totalPages:              'Text2',

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
    'booking.whereBooked':        'WHERE BOOKED',
    'booking.warrant':            'WARRANT',
    'booking.court':              'COURT',
    'booking.action':             'ACTION',
    'booking.deptEnRouteTo':      'DEPTENROUTE TO',
    'booking.cruCheck':           'CRU CHECK NAMESTAR',
    'booking.warrantViolations':  'WARRANT VIOLATIONS',
    'booking.bail':               'BAIL',
    'booking.mirandizedStar':     'STAR_2',
    'booking.citation':           'CITATION',
    'booking.citationViolations': 'CITATION VIOLATIONS',
    'booking.appearanceDateTime': 'DATETIME OF APPEARANCE',
    'booking.appearanceLocation': 'LOCATION OF APPEARANCE',
    'booking.mac':                'MAC',

    // Subject other info
    subjectOtherInfo: 'OTHER INFORMATION CITATIONWARRANTBOOKING CHARGESMISSING PERSONSUBJECT LAST SEEN WEARING',

    // Reporting party
    'reportingParty.code':                  'CODE_2',
    'reportingParty.name':                  'NAME LAST FIRST MIDDLE_2',
    'reportingParty.race':                  'RACE_2',
    'reportingParty.sex':                   'SEX_2',
    'reportingParty.height':                'HEIGHT_2',
    'reportingParty.weight':                'WEIGHT_2',
    'reportingParty.hair':                  'HAIR_2',
    'reportingParty.eyes':                  'EYES_2',
    'reportingParty.residenceAddress':      'RESIDENCE ADDRESSCITY IF NOT SAN FRANCISCO_2',
    'reportingParty.residenceZip':          'ZIP CODE_3',
    'reportingParty.contactPhone':          'CONTACT PHONE NUMBER_2',
    'reportingParty.businessAddress':       'BUSINESS ADDRESSNAME OF SCHOOL IF JUVENILECITY IF NOT SAN FRANCISCO_2',
    'reportingParty.businessZip':           'ZIP CODE_4',
    'reportingParty.businessPhone':         'BUSINESS PHONE_2',
    'reportingParty.email':                 'EMAIL_2',
    'reportingParty.idNumber':              'ID NO SOC SECOP LICFBICII',
    'reportingParty.sfxNumber':             'SFX NUMBER',
    'reportingParty.relationshipToSubject': 'RELATIONSHIP TO SUBJECT',

    // Victim notifications
    victimNotificationStar:      'STAR_3',
    victimCrimeNotificationStar: 'STAR_4',
    extentOfInjury:              'EXTENT OF INJURYTREATMENT',
    rpOtherInfo:                 'OTHER INFORMATION SUBJECT LAST SEEN WEARINGEMPLOYMENTACTIVITY AT TIME OF INCIDENT',

    // Narrative (page 2)
    narrative:                   'PAGE',
  },

  checkbox: {
    arrestMade:                         'ARREST MADE',
    addlTypesSeeNarrative:              'undefined',
    addlCodesSeeNarrative:              'DDL CODES',
    dvIncident:                         'undefined_2',
    elderAbuse:                         'undefined_3',
    gangRelated:                        'GANG',
    juvenileRelated:                    'JUVENILE',
    prejudiceBased:                     'PREJUDICE',
    prop115Certified:                   'BELIEF FOLLOWING AN INVESTIGATION OF THE EVENTS AND PARTIES INVOLVED',
    postTraining:                       'POST TRAINING',
    'booking.addlWarrants':             'ADD\'L WARRANTS',
    'booking.addlCharges':              'ADDL CHARGES',
    'booking.addlCiteSections':         'ADDL CITE SECTIONS',
    'booking.bookingApproved':          'BOOKING APPROVED BY PRINT NAMESTAR',
    'booking.addlWarrantsSeeNarrative': 'ADDL WARRANTS SEE NARRATIVE',
    'booking.citationIssued':           'CITATION_2',
  },

  dropdown: {
    locationSentTo:   'Dropdown2',
    dispositionCode:  'Dropdown4',
  },

  booleanPair: {
    'booking.mirandized':      ['MIRANDIZED YES', 'MIRANDIZED NO'],
    'booking.sdcsEntry':       ['sdcs yes', 'sdcs no'],
    'booking.xrays':           ['Y', 'N'],
    'booking.addlSubjects':    ['Y_2', 'N_2'],
    addlReportingParties:      ['Y_3', 'N_3'],
  },

  radio: {
    'booking.statement':       { field: 'STATEMENT', yes: 'YES_2', no: 'NO_2' },
    pcNotification:            { field: '293 PC NOTIFICATION', yes: 'YES_3', no: 'NO_3', na: 'NA' },
    confidentialityRequested:  { field: 'CONFIDENTIALITY REQUESTED', yes: 'YES_4', no: 'NO_4' },
    victimCrimeNotification:   { field: 'VICTIM OF CRIME NOTIFICATION', yes: 'YES_5', no: 'NO_5', na: 'NA_2' },
    followUpForm:              { field: 'FOLLOW UP FORM', yes: 'YES_6', no: 'NO_6' },
    rpStatement:               { field: 'STATEMENT_2', yes: 'YES_7', no: 'NO_7' },
  },

  enumCheckbox: {
    suspectStatus: {
      known:      'KNOWN',
      unknown:    'UNKNOWN',
      nonSuspect: 'NONSUSPECTSUBJECT INCIDENT',
    },
    reportType: {
      initial:      'INITIAL',
      supplemental: 'SUPP',
    },
  },

  array: {
    incidentCodes:     ['INCIDENT CODE 1', 'INCIDENT CODE 2', 'INCIDENT CODE 3'],
    'booking.charges': ['BOOKING SECTIONCHARGE 1', 'BOOKING SECTIONCHARGE 2',
      'BOOKING SECTIONCHARGE 3', 'BOOKING SECTIONCHARGE 4'],
  },

  composite: [
    { fields: ['subject.dob', 'subject.age'], pdfField: 'DOBAGE', join: ' / ' },
    { fields: ['reportingParty.dob', 'reportingParty.age'], pdfField: 'DOBAGE_2', join: ' / ' },
  ],
};

/**
 * Fill a 849(b) PDF template with the given data.
 *
 * @param {Uint8Array|Buffer} pdfBytes  Raw bytes of Form849b.pdf template.
 * @param {object}            data      Data object (see README / JSDoc below).
 * @returns {Promise<Uint8Array>}       Filled PDF bytes, ready to write.
 */
export async function fill849b (pdfBytes, data) {
  // Inject page numbers and default totalPages
  const withPages = { ...data };
  return fillPdf(pdfBytes, withPages, spec, {
    customize (form) {
      // Page numbers (always 1 and 2)
      form.getTextField('Text1').setText('1');
      form.getTextField('Text1_2').setText('2');
      if (data.totalPages == null) {
        form.getTextField('Text2').setText('2');
      }
    },
    finalize (form, pdfDoc, font) {
      for (const name of COMB_FIELDS) {
        setCombFieldAppearance(form, pdfDoc, font, name);
      }
    },
  });
}
