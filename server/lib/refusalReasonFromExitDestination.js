const REFUSAL_REASON_BY_EXIT_DESTINATION = {
  jail: 'aggressive_behavior',
  hospital: 'medical_issue',
};

export function refusalReasonIdFromExitDestination (exitDestinationId) {
  return REFUSAL_REASON_BY_EXIT_DESTINATION[exitDestinationId] ?? null;
}
