const VALID_RELEASE_REASON_IDS = new Set(['sobered', 'medical_issue', 'behavioral_health_evaluation', 'other']);
const VALID_EXIT_DESTINATION_IDS = new Set(['hospital', 'other']);

export function getPrefilledLegalReleaseState (searchParams) {
  const releaseReasonId = searchParams.get('releaseReasonId');
  const exitDestinationId = searchParams.get('exitDestinationId');

  if (!VALID_RELEASE_REASON_IDS.has(releaseReasonId)) {
    return {
      releaseReasonId: null,
      exitDestinationId: null,
    };
  }

  if (releaseReasonId !== 'medical_issue' && releaseReasonId !== 'behavioral_health_evaluation') {
    return {
      releaseReasonId,
      exitDestinationId: null,
    };
  }

  return {
    releaseReasonId,
    exitDestinationId: VALID_EXIT_DESTINATION_IDS.has(exitDestinationId)
      ? exitDestinationId
      : null,
  };
}
