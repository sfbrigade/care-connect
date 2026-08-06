const VALID_RELEASE_REASONS = new Set(['SOBERED', 'MEDICAL_ISSUE', 'BEHAVIORAL_HEALTH_EVALUATION', 'OTHER']);
const VALID_EXIT_DESTINATIONS = new Set(['HOSPITAL_EMS', 'OTHER']);

export function getPrefilledLegalReleaseState (searchParams) {
  const releaseReason = searchParams.get('releaseReason');
  const exitDestination = searchParams.get('exitDestination');

  if (!VALID_RELEASE_REASONS.has(releaseReason)) {
    return {
      releaseReason: null,
      exitDestination: null,
    };
  }

  if (releaseReason !== 'MEDICAL_ISSUE' && releaseReason !== 'BEHAVIORAL_HEALTH_EVALUATION') {
    return {
      releaseReason,
      exitDestination: null,
    };
  }

  return {
    releaseReason,
    exitDestination: VALID_EXIT_DESTINATIONS.has(exitDestination)
      ? exitDestination
      : null,
  };
}
