const SEE_ABOVE = 'SEE ABOVE';

function normalizeValue (value) {
  let normalized = value;
  if (typeof value === 'string') {
    normalized = value.trim();
  }
  return normalized || null;
}

export function build849bReleaseNarrative ({ incident, behavior } = {}) {
  const incidentNumber = normalizeValue(incident?.caseNumber) || SEE_ABOVE;
  const cadNumber = normalizeValue(incident?.cadNumber) || SEE_ABOVE;
  const behaviorNarrative = normalizeValue(behavior) || SEE_ABOVE;

  return [
    `Incident number: ${incidentNumber}`,
    `Cad number: ${cadNumber}`,
    'Subject was brought to RESET because they were found to be under the influence of a controlled substance or alcohol in a public location. Upon being able to care for themselves, they were released from their detention.',
    '',
    'The Officer who brought the person to RESET recorded the following observations on the 647(f) documentation:',
    behaviorNarrative,
  ].join('\n');
}
