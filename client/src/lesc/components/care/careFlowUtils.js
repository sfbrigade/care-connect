function isTransferredToJail (deflection) {
  return (
    deflection?.subjectStatus === 'EXITED' &&
    deflection?.exitDestination === 'JAIL'
  );
}

function isTransferredToHospital (deflection) {
  return (
    deflection?.subjectStatus === 'EXITED' &&
    deflection?.exitDestination === 'HOSPITAL' &&
    !deflection?.releasedAt
  );
}

export function shouldShowCareCardViewDetails (deflection) {
  return deflection?.subjectStatus !== 'EXITED';
}

export function hasPersistedExitDetails (deflection) {
  return Boolean(
    deflection?.exitDestination &&
    deflection?.exitHousingStatus &&
    deflection?.exitConnectedToCare &&
    deflection?.exitSFResident
  );
}

export function hasAnyPersistedExitDetails (deflection) {
  return Boolean(
    deflection?.exitDestination ||
    deflection?.exitHousingStatus ||
    deflection?.exitConnectedToCare ||
    deflection?.exitSFResident
  );
}

export function groupCareNotInCustodySections (deflections = []) {
  return {
    STILL_ONSITE: deflections.filter(d => d.subjectStatus === 'RELEASED'),
    EXITED_FACILITY: deflections.filter(
      d => d.subjectStatus === 'EXITED' &&
        !isTransferredToJail(d) &&
        !isTransferredToHospital(d)
    ),
    TRANSFERRED_TO_JAIL: deflections.filter(
      d => isTransferredToJail(d)
    ),
    TRANSFERRED_TO_HOSPITAL: deflections.filter(
      d => isTransferredToHospital(d)
    ),
  };
}

export function getCareExitBackTo ({ fromDetail, id }) {
  if (fromDetail) return `/care/${id}`;
  return '/care';
}

export function getCareExitSuccessPayload (deflectionId) {
  return {
    highlightTarget: String(deflectionId),
    navigateTo: '/care?tab=not-in-custody',
    toastTitle: 'Exit recorded',
    toastBody: 'Person now appears in "Exited facility" under "Legally released" (for 24 hours).',
  };
}

export function getCareExitPrimaryActionState ({
  isExitFormComplete,
  hasAssociatedProperty,
  propertyReturnHandledConfirmed,
  isSaving,
}) {
  return {
    label: 'Confirm exit',
    disabled: !isExitFormComplete ||
      (hasAssociatedProperty && propertyReturnHandledConfirmed !== true) ||
      isSaving,
  };
}
