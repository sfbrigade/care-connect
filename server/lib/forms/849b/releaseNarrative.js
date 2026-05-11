import { firstLastName } from '../shared/formUtils.js';

const SEE_ABOVE = 'SEE ABOVE';
const MEDICAL_STAFF_BLANK = '_'.repeat(30);
const FORM_TIMEZONE = 'America/Los_Angeles';

function normalizeValue (value) {
  let normalized = value;
  if (typeof value === 'string') {
    normalized = value.trim();
  }
  return normalized || null;
}

function firstInitialLastNameNoPeriod (person) {
  const firstInitial = person?.firstName?.trim()?.charAt(0)?.toUpperCase();
  const lastName = normalizeValue(person?.lastName);
  return [firstInitial, lastName].filter(Boolean).join(' ');
}

function formatReleaseTime (date) {
  if (!date) return 'XX:XX';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'XX:XX';

  return d.toLocaleString('en-US', {
    timeZone: FORM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace('24:', '00:');
}

function formatReleaseDate (date) {
  if (!date) return 'MM/DD/YY';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'MM/DD/YY';

  return d.toLocaleString('en-US', {
    timeZone: FORM_TIMEZONE,
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
}

export function build849bReleaseNarrative ({ caseNumber, cadNumber, behavior } = {}) {
  const incidentNumber = normalizeValue(caseNumber) || SEE_ABOVE;
  const normalizedCadNumber = normalizeValue(cadNumber) || SEE_ABOVE;
  const behaviorNarrative = normalizeValue(behavior) || SEE_ABOVE;

  return [
    `Incident number: ${incidentNumber}`,
    `Cad number: ${normalizedCadNumber}`,
    'Subject was brought to RESET because they were found to be under the influence of a controlled substance or alcohol in a public location. Upon being able to care for themselves, they were released from their detention.',
    '',
    'The Officer who brought the person to RESET recorded the following observations on the 647(f) documentation:',
    behaviorNarrative,
  ].join('\n');
}

export function buildSobered849bReleaseNarrativeAppendix ({
  releasedAt,
  releasingDeputy,
  subject,
} = {}) {
  const subjectName = firstLastName(subject);
  const deputyName = firstInitialLastNameNoPeriod(releasingDeputy);
  const deputyStar = normalizeValue(releasingDeputy?.badgeNumber) || '';

  return `At approximately ${formatReleaseTime(releasedAt)} hours on ${formatReleaseDate(releasedAt)}, Connections medical staff, ${MEDICAL_STAFF_BLANK} , determined that the subject, ${subjectName}, was able to care for themselves and voice their needs appropriately. Deputy ${deputyName}, #${deputyStar}, issued ${subjectName} a certificate of release stating that they were just detained and not under arrest.`;
}

export function appendSobered849bReleaseNarrative ({
  releaseNarrative,
  caseNumber,
  cadNumber,
  behavior,
  releasedAt,
  releasingDeputy,
  subject,
} = {}) {
  const baseNarrative = normalizeValue(releaseNarrative) || build849bReleaseNarrative({
    caseNumber,
    cadNumber,
    behavior,
  });

  return [
    baseNarrative,
    '',
    buildSobered849bReleaseNarrativeAppendix({
      releasedAt,
      releasingDeputy,
      subject,
    }),
  ].join('\n');
}
