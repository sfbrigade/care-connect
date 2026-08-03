// lib/forms/pdf/Form849b.jsx
import { z } from "zod";
import { readFile } from "fs/promises";
import { join } from "path";
import { DrugTypeEnum } from "@prisma/client";

// lib/forms/pdf/fill849b.js
import { PDFDocument, PDFName, PDFBool } from "pdf-lib";
var TEXT = {
  // Header
  incidentNumber: "INCIDENT NUMBER",
  cadNumber: "CAD NUMBER",
  relatedCaseNumber: "RELATED CASE NUMBER",
  totalPages: "Text2",
  // shared across both pages (widgetCount: 2)
  // Incident
  primaryIncidentType: "PRIMARY INCIDENT TYPE",
  occurrenceDateTime: "DATETIME OF OCCURRENCE",
  reportedDateTime: "DATETIME REPORTED TO SFSO",
  additionalIncidentTypes: "ADDITIONAL INCIDENT TYPES DDL  SEE NARRATIVE",
  location: "LOCATION OF OCCURRENCE",
  premiseType: "TYPE OF PREMISE",
  reportedTo: "REPORTED TO SFSO CRUCIUSOCSFPD OPS NAMESTARDATETIME",
  dvWeaponUsed: "DV INCIDENT WPN USED",
  // Declaration
  prop115Years: "Text3",
  // Deputy
  reportingDeputy: "REPORTING DEPUTY PRINT",
  star: "STAR",
  divisionUnit: "SFSO DIVISIONUNITIDENTIFIER",
  supervisorApproval: "SUPERVISOR APPROVING REPORT PRINT NAMESTAR",
  watch: "WATCH",
  assignTo: "ASSIGN TO",
  assignedBy: "ASSIGNED BY INITALSSTAR",
  copiesTo: "COPIES TO DDL UNITSGENCIES",
  prop115Pages: "Text4",
  // Subject
  "subject.code": "CODE",
  "subject.name": "NAME LAST FIRST MIDDLE",
  "subject.race": "RACE",
  "subject.sex": "SEX",
  "subject.height": "HEIGHT",
  "subject.weight": "WEIGHT",
  "subject.hair": "HAIR",
  "subject.eyes": "EYES",
  "subject.residenceAddress": "RESIDENCE ADDRESSCITY IF NOT SAN FRANCISCO",
  "subject.residenceZip": "ZIP CODE",
  "subject.contactPhone": "CONTACT PHONE NUMBER",
  "subject.businessAddress": "BUSINESS ADDRESSNAME OF SCHOOL IF JUVENILECITY IF NOT SAN FRANCISCO",
  "subject.businessZip": "ZIP CODE_2",
  "subject.businessPhone": "BUSINESS PHONE",
  "subject.email": "EMAIL",
  "subject.knownAlias": "KNOWN ALIAS",
  "subject.idNumber": "ID NO SOCSECOPLICFBICII",
  "subject.sfNumber": "SF NUMBER",
  // Booking
  "booking.whereBooked": "WHERE BOOKED",
  "booking.warrant": "WARRANT",
  "booking.court": "COURT",
  "booking.action": "ACTION",
  "booking.deptEnRouteTo": "DEPTENROUTE TO",
  "booking.cruCheck": "CRU CHECK NAMESTAR",
  "booking.warrantViolations": "WARRANT VIOLATIONS",
  "booking.bail": "BAIL",
  "booking.mirandizedStar": "STAR_2",
  "booking.citation": "CITATION",
  "booking.citationViolations": "CITATION VIOLATIONS",
  "booking.appearanceDateTime": "DATETIME OF APPEARANCE",
  "booking.appearanceLocation": "LOCATION OF APPEARANCE",
  "booking.mac": "MAC",
  // Subject other info
  subjectOtherInfo: "OTHER INFORMATION CITATIONWARRANTBOOKING CHARGESMISSING PERSONSUBJECT LAST SEEN WEARING",
  // Reporting party
  "reportingParty.code": "CODE_2",
  "reportingParty.name": "NAME LAST FIRST MIDDLE_2",
  "reportingParty.race": "RACE_2",
  "reportingParty.sex": "SEX_2",
  "reportingParty.height": "HEIGHT_2",
  "reportingParty.weight": "WEIGHT_2",
  "reportingParty.hair": "HAIR_2",
  "reportingParty.eyes": "EYES_2",
  "reportingParty.residenceAddress": "RESIDENCE ADDRESSCITY IF NOT SAN FRANCISCO_2",
  "reportingParty.residenceZip": "ZIP CODE_3",
  "reportingParty.contactPhone": "CONTACT PHONE NUMBER_2",
  "reportingParty.businessAddress": "BUSINESS ADDRESSNAME OF SCHOOL IF JUVENILECITY IF NOT SAN FRANCISCO_2",
  "reportingParty.businessZip": "ZIP CODE_4",
  "reportingParty.businessPhone": "BUSINESS PHONE_2",
  "reportingParty.email": "EMAIL_2",
  "reportingParty.idNumber": "ID NO SOC SECOP LICFBICII",
  "reportingParty.sfxNumber": "SFX NUMBER",
  "reportingParty.relationshipToSubject": "RELATIONSHIP TO SUBJECT",
  // Victim notifications
  victimNotificationStar: "STAR_3",
  victimCrimeNotificationStar: "STAR_4",
  extentOfInjury: "EXTENT OF INJURYTREATMENT",
  rpOtherInfo: "OTHER INFORMATION SUBJECT LAST SEEN WEARINGEMPLOYMENTACTIVITY AT TIME OF INCIDENT",
  // Narrative (page 2)
  narrative: "PAGE"
};
var CHECKBOX = {
  arrestMade: "ARREST MADE",
  addlTypesSeeNarrative: "undefined",
  // ADD'L – SEE NARRATIVE (incident types)
  addlCodesSeeNarrative: "DDL CODES",
  // ADD'L CODES SEE NARRATIVE
  dvIncident: "undefined_2",
  // DV INCIDENT (WPN USED) checkbox
  elderAbuse: "undefined_3",
  // ELDER ABUSE
  gangRelated: "GANG",
  juvenileRelated: "JUVENILE",
  prejudiceBased: "PREJUDICE",
  prop115Certified: "BELIEF FOLLOWING AN INVESTIGATION OF THE EVENTS AND PARTIES INVOLVED",
  postTraining: "POST TRAINING",
  // Booking
  "booking.addlWarrants": "ADD'L WARRANTS",
  // ADD'L - SEE NARRATIVE (warrant row)
  "booking.addlCharges": "ADDL CHARGES",
  "booking.addlCiteSections": "ADDL CITE SECTIONS",
  "booking.bookingApproved": "BOOKING APPROVED BY PRINT NAMESTAR",
  "booking.addlWarrantsSeeNarrative": "ADDL WARRANTS SEE NARRATIVE",
  "booking.citationIssued": "CITATION_2"
};
var DROPDOWN = {
  locationSentTo: "Dropdown2",
  // 'Same' | 'Same/On View' | 'Other'
  dispositionCode: "Dropdown4"
  // 'ADV' | 'ARR/F' | 'ARR/M' | etc.
};
var BOOLEAN_PAIR = {
  "booking.mirandized": ["MIRANDIZED YES", "MIRANDIZED NO"],
  "booking.sdcsEntry": ["sdcs yes", "sdcs no"],
  "booking.xrays": ["Y", "N"],
  "booking.addlSubjects": ["Y_2", "N_2"],
  addlReportingParties: ["Y_3", "N_3"]
};
var RADIO = {
  "booking.statement": { field: "STATEMENT", yes: "YES_2", no: "NO_2" },
  pcNotification: { field: "293 PC NOTIFICATION", yes: "YES_3", no: "NO_3", na: "NA" },
  confidentialityRequested: { field: "CONFIDENTIALITY REQUESTED", yes: "YES_4", no: "NO_4" },
  victimCrimeNotification: { field: "VICTIM OF CRIME NOTIFICATION", yes: "YES_5", no: "NO_5", na: "NA_2" },
  followUpForm: { field: "FOLLOW UP FORM", yes: "YES_6", no: "NO_6" },
  rpStatement: { field: "STATEMENT_2", yes: "YES_7", no: "NO_7" }
};
var ENUM_CHECKBOX = {
  suspectStatus: {
    known: "KNOWN",
    unknown: "UNKNOWN",
    nonSuspect: "NONSUSPECTSUBJECT INCIDENT"
  },
  reportType: {
    initial: "INITIAL",
    supplemental: "SUPP"
  }
};
var ARRAY = {
  incidentCodes: ["INCIDENT CODE 1", "INCIDENT CODE 2", "INCIDENT CODE 3"],
  "booking.charges": [
    "BOOKING SECTIONCHARGE 1",
    "BOOKING SECTIONCHARGE 2",
    "BOOKING SECTIONCHARGE 3",
    "BOOKING SECTIONCHARGE 4"
  ]
};
function applyDobAge(form, pdfField, data, prefix) {
  const dob = get(data, `${prefix}.dob`);
  const age = get(data, `${prefix}.age`);
  if (dob == null && age == null) return;
  let value;
  if (dob && age) value = `${dob} / ${age}`;
  else value = dob || age;
  form.getTextField(pdfField).setText(String(value));
}
function get(obj, path) {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return void 0;
    cur = cur[p];
  }
  return cur;
}
async function fill849b(pdfBytes, data) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  for (const [key, pdfField] of Object.entries(TEXT)) {
    const val = get(data, key);
    if (val != null && val !== "") {
      form.getTextField(pdfField).setText(String(val));
    }
  }
  form.getTextField("Text1").setText("1");
  form.getTextField("Text1_2").setText("2");
  if (get(data, "totalPages") == null) {
    form.getTextField("Text2").setText("2");
  }
  for (const [key, pdfField] of Object.entries(CHECKBOX)) {
    const val = get(data, key);
    if (val === true) form.getCheckBox(pdfField).check();
    else if (val === false) form.getCheckBox(pdfField).uncheck();
  }
  for (const [key, pdfField] of Object.entries(DROPDOWN)) {
    const val = get(data, key);
    if (val != null) form.getDropdown(pdfField).select(val);
  }
  for (const [key, [yesField, noField]] of Object.entries(BOOLEAN_PAIR)) {
    const val = get(data, key);
    if (val === true) {
      form.getCheckBox(yesField).check();
      form.getCheckBox(noField).uncheck();
    }
    if (val === false) {
      form.getCheckBox(yesField).uncheck();
      form.getCheckBox(noField).check();
    }
  }
  for (const [key, { field, yes, no, na }] of Object.entries(RADIO)) {
    const val = get(data, key);
    if (val === true) form.getRadioGroup(field).select(yes);
    else if (val === false) form.getRadioGroup(field).select(no);
    else if (val === null && na) form.getRadioGroup(field).select(na);
  }
  for (const [key, mapping] of Object.entries(ENUM_CHECKBOX)) {
    const val = get(data, key);
    if (val != null) {
      for (const pdfField of Object.values(mapping)) {
        form.getCheckBox(pdfField).uncheck();
      }
      const target = mapping[val];
      if (target) form.getCheckBox(target).check();
    }
  }
  for (const [key, pdfFields] of Object.entries(ARRAY)) {
    const arr = get(data, key);
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < pdfFields.length; i++) {
      const val = arr[i];
      if (val != null && val !== "") {
        form.getTextField(pdfFields[i]).setText(String(val));
      }
    }
  }
  applyDobAge(form, "DOBAGE", data, "subject");
  applyDobAge(form, "DOBAGE_2", data, "reportingParty");
  const acroForm = pdfDoc.catalog.lookup(PDFName.of("AcroForm"));
  acroForm.set(PDFName.of("NeedAppearances"), PDFBool.True);
  return pdfDoc.save({ updateFieldAppearances: false });
}

// lib/forms/pdf/releaseNarrative.js
var SEE_ABOVE = "SEE ABOVE";
function normalizeValue(value) {
  let normalized = value;
  if (typeof value === "string") {
    normalized = value.trim();
  }
  return normalized || null;
}
function build849bReleaseNarrative({ caseNumber, cadNumber, behavior } = {}) {
  const incidentNumber = normalizeValue(caseNumber) || SEE_ABOVE;
  const normalizedCadNumber = normalizeValue(cadNumber) || SEE_ABOVE;
  const behaviorNarrative = normalizeValue(behavior) || SEE_ABOVE;
  return [
    `Incident number: ${incidentNumber}`,
    `Cad number: ${normalizedCadNumber}`,
    "Subject was brought to RESET because they were found to be under the influence of a controlled substance or alcohol in a public location. Upon being able to care for themselves, they were released from their detention.",
    "",
    "The SFPD Officer who brought the person to RESET recorded the following observations on the 647(f) documentation:",
    behaviorNarrative
  ].join("\n");
}

// lib/forms/formUtils.js
var FORM_TIMEZONE = "America/Los_Angeles";
function formatDateTime24(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const date = d.toLocaleString("en-US", { timeZone: FORM_TIMEZONE, month: "2-digit", day: "2-digit", year: "numeric" });
  const time = d.toLocaleString("en-US", { timeZone: FORM_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).replace("24:", "00:");
  return `${date} ${time}`;
}

// lib/forms/pdf/Form849b.jsx
import { jsx } from "react/jsx-runtime";
var metadata = {
  generatorType: "pdf",
  canGenerate(deflection) {
    return deflection.releasedAt ? true : { message: "The SFSO 849(b) Report can only be generated after the subject has been released." };
  },
  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdBy: {
          include: {
            organization: true,
            unit: true,
            title: true
          }
        }
      }
    },
    releaseReason: true
  },
  dataSchema: z.object({
    cadNumber: z.string(),
    caseNumber: z.string(),
    arrestedAt: z.string().nullable(),
    arrestLocation: z.string(),
    officerName: z.string(),
    officerBadge: z.string(),
    subjectName: z.string(),
    subjectFullName: z.string(),
    subjectRace: z.string(),
    subjectSex: z.string(),
    subjectDOB: z.string().nullable(),
    subjectAddress: z.string(),
    subjectZip: z.string(),
    subjectDL: z.string(),
    subjectLocalId: z.string(),
    arrivedAtReset: z.string().nullable(),
    transferredAt: z.string().nullable(),
    releasedAt: z.string(),
    releaseReason: z.string(),
    behavior: z.string().nullable(),
    releaseNarrative: z.string().nullable()
  }),
  transformData(deflection) {
    const incident = deflection.incident;
    const subject = deflection.subject;
    let subjectName = "";
    let subjectFullName = "";
    if (subject) {
      subjectName = [subject.lastName, subject.firstName, subject.middleInitial].filter(Boolean).join(", ");
      subjectFullName = [subject.firstName, subject.middleInitial, subject.lastName].filter(Boolean).join(" ");
    }
    const incidentCreator = incident?.createdBy;
    const officerName = incidentCreator ? `${incidentCreator.firstName} ${incidentCreator.lastName}` : "";
    const officerBadge = incident?.createdByBadgeNumber || incidentCreator?.badgeNumber || "";
    const arrestLocation = [incident?.addressLine1, incident?.city, incident?.state].filter(Boolean).join(", ");
    const subjectAddress = [subject?.addressLine1, subject?.city, subject?.state].filter(Boolean).join(", ");
    return {
      cadNumber: incident?.cadNumber || "",
      caseNumber: incident?.caseNumber || "",
      arrestedAt: formatDateTime24(incident?.arrestedAt?.toISOString()),
      arrestLocation,
      locationSentTo: incident?.encounteredVia === "ON_VIEW" ? "Same/On View" : "Other",
      officerName,
      officerBadge,
      subjectName,
      subjectFullName,
      subjectRace: subject?.race || "",
      subjectSex: subject?.sex || "",
      subjectDOB: subject?.dateOfBirth ? `${String(subject.dateOfBirth.getUTCMonth() + 1).padStart(2, "0")}-${String(subject.dateOfBirth.getUTCDate()).padStart(2, "0")}-${subject.dateOfBirth.getUTCFullYear()}` : null,
      subjectAddress,
      subjectZip: subject?.postalCode || "",
      subjectDL: subject?.driverLicense || "",
      subjectLocalId: subject?.localId || "",
      subjectDrugType: deflection.drugType || null,
      arrivedAtReset: incident?.arrivedAt?.toISOString() || null,
      transferredAt: deflection.transferredAt?.toISOString() || null,
      releasedAt: deflection.releasedAt.toISOString(),
      releaseReason: deflection.releaseReason?.name || "",
      behavior: deflection.behavior || null,
      releaseNarrative: deflection.releaseNarrative || null
    };
  },
  async generatePdf(deflectionData, user) {
    const templatePath = join(process.cwd(), "lib/forms/pdf/templates/Form849b.pdf");
    const templateBytes = await readFile(templatePath);
    const isDrugTypeCNSDepressants = deflectionData.subjectDrugType === DrugTypeEnum.CNS_DEPRESSANTS;
    const formData = {
      // Header fields
      incidentNumber: deflectionData.caseNumber,
      cadNumber: deflectionData.cadNumber,
      // Incident fields
      primaryIncidentType: isDrugTypeCNSDepressants ? "Alcohol, Under Influence in Public Place, Investigative Detention" : "Drugs, Under Influence in a Public Place, Investigative Detention",
      occurrenceDateTime: deflectionData.arrestedAt,
      reportedDateTime: deflectionData.arrestedAt,
      additionalIncidentTypes: "",
      // TBC
      location: deflectionData.arrestLocation,
      premiseType: "",
      locationSentTo: deflectionData.locationSentTo,
      reportedTo: "",
      // TBC
      // Page info
      prop115Years: "2",
      prop115Pages: "2",
      // Prop 115 certified - from user profile
      prop115Certified: user?.prop115Certified ?? false,
      // Deputy fields - from user profile (not incident creator)
      reportingDeputy: user ? `${user.firstName} ${user.lastName}` : "",
      star: user?.badgeNumber || "",
      divisionUnit: user?.unit?.name || "",
      supervisorApproval: "",
      watch: "",
      assignTo: "",
      assignedBy: "",
      copiesTo: "",
      // Subject fields
      suspectStatus: "known",
      subject: {
        code: "D",
        name: deflectionData.subjectName,
        race: deflectionData.subjectRace,
        sex: deflectionData.subjectSex,
        dob: deflectionData.subjectDOB,
        residenceAddress: deflectionData.subjectAddress,
        residenceZip: deflectionData.subjectZip,
        contactPhone: "",
        idNumber: deflectionData.subjectDL,
        sfNumber: deflectionData.subjectLocalId,
        knownAlias: "",
        height: "",
        weight: "",
        hair: "",
        eyes: "",
        businessAddress: "",
        businessZip: "",
        businessPhone: "",
        email: ""
      },
      // Report type - Supp. checked per requirements
      reportType: "supplemental",
      // Incident codes based on drug type
      incidentCodes: isDrugTypeCNSDepressants ? ["19090", "64085"] : ["19095", "64085"],
      narrative: deflectionData.releaseNarrative || build849bReleaseNarrative({
        caseNumber: deflectionData.caseNumber,
        cadNumber: deflectionData.cadNumber,
        behavior: deflectionData.behavior
      })
    };
    return fill849b(templateBytes, formData);
  }
};
function Form849b() {
  return /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "1rem", fontWeight: "bold" }, children: "No HTML preview available for form 849(b)." });
}
export {
  Form849b as default,
  metadata
};
