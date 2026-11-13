const REFUSAL_REASON_BY_EXIT_DESTINATION = {
  JAIL: 'AGGRESSIVE_BEHAVIOR',
  HOSPITAL_EMS: 'MEDICAL_ISSUE',
};

export function refusalReasonFromExitDestination (exitDestination) {
  return REFUSAL_REASON_BY_EXIT_DESTINATION[exitDestination] ?? null;
}
