import { readFile } from 'fs/promises';
import { join } from 'path';

import { firstLastName, formatDateOnly, formatTime } from '../shared/formUtils.js';
import { fill5150 } from './fill5150.js';

// transformData pulls only the fields fill5150 cares about. Anything we
// can't confidently auto-populate is left blank — see fill5150's TEXT map
// for the full list of populated PDF fields, and metadata.js for the
// rationale on the broader set we leave untouched.
export function transformData (deflection) {
  const subject = deflection.subject;
  const incident = deflection.incident;
  const facility = deflection.facility;
  const releasedBy = deflection.releasedBy;

  const subjectFullName = subject
    ? [subject.firstName, subject.middleInitial, subject.lastName].filter(Boolean).join(' ')
    : '';
  const subjectAddress = subject
    ? [subject.addressLine1, subject.city, subject.state].filter(Boolean).join(', ')
    : '';
  const subjectDOB = formatDateOnly(subject?.dateOfBirth);

  const officerName = firstLastName(releasedBy);
  const officerTitle = releasedBy?.title?.name ?? '';
  const officerBadge = releasedBy?.badgeNumber ?? '';

  const advisementDate = formatDateOnly(deflection.releasedAt);
  const advisementTime = formatTime(deflection.releasedAt);
  const detainmentStartDate = formatDateOnly(incident?.arrestedAt);
  const detainmentStartTime = formatTime(incident?.arrestedAt);

  return {
    // Advisement (top of form)
    advisementDate,
    advisementText: officerName,            // "My name is ___"
    advisementCompletedBy: officerName,
    advisementPosition: officerTitle,

    // Application body
    applicationSubjectName: subjectFullName,
    detainmentStartDate,
    detainmentStartTime,
    subjectDOBLower: subjectDOB,
    subjectAddress,

    // Agency / officer block (bottom of form)
    agencyName: facility?.name ?? '',
    agencyAddress: facility?.addressLine1 ?? '',
    agencyCity: facility?.city ?? '',
    agencyState: facility?.state ?? '',
    agencyZip: facility?.postalCode ?? '',
    officerName,
    officerTitle,
    officerBadge,
    officerPhone: facility?.phone ?? '',

    // Lower advisement block
    advisementDateLower: advisementDate,
    advisementTimeLower: advisementTime,

    // Subject identifier block
    subjectName: subjectFullName,
    subjectDOBUpper: subjectDOB,
  };
}

export async function generatePdf (data) {
  const templatePath = join(process.cwd(), 'lib/forms/5150/template.pdf');
  const templateBytes = await readFile(templatePath);
  return Buffer.from(await fill5150(templateBytes, data));
}
