function isTransferredToJailWithoutLegalRelease (deflection) {
  return (
    deflection?.subjectStatus === 'EXITED' &&
    deflection?.exitDestinationId === 'jail' &&
    !deflection?.releasedAt
  );
}

function isTransferredToHospitalWithoutLegalRelease (deflection) {
  return (
    deflection?.subjectStatus === 'EXITED' &&
    deflection?.exitDestinationId === 'hospital' &&
    !deflection?.releasedAt
  );
}

export function shouldShowCareCardViewDetails (deflection) {
  return deflection?.subjectStatus !== 'EXITED';
}

export function hasPersistedExitDetails (deflection) {
  return Boolean(
    deflection?.exitDestinationId &&
    deflection?.exitHousingStatusId &&
    deflection?.exitConnectedToCare &&
    deflection?.exitSFResident
  );
}

export function groupCareNotInCustodySections (deflections = []) {
  return {
    STILL_ONSITE: deflections.filter(d => d.subjectStatus === 'RELEASED'),
    EXITED_FACILITY: deflections.filter(
      d => d.subjectStatus === 'EXITED' &&
        !isTransferredToJailWithoutLegalRelease(d) &&
        !isTransferredToHospitalWithoutLegalRelease(d)
    ),
    TRANSFERRED_TO_JAIL: deflections.filter(
      d => isTransferredToJailWithoutLegalRelease(d)
    ),
    TRANSFERRED_TO_HOSPITAL: deflections.filter(
      d => isTransferredToHospitalWithoutLegalRelease(d)
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
    toastBody: 'Person now appears in Exited facility under Not in custody (last 24 hours).',
  };
}

export function getCareExitPrimaryActionState ({
  isSectionTwoComplete,
  physicalLeftFinal,
  propertyReturnHandledConfirmed,
  isSaving,
}) {
  return {
    label: physicalLeftFinal
      ? 'Confirm exit'
      : 'Save exit details',
    disabled: !isSectionTwoComplete ||
      (physicalLeftFinal === null || physicalLeftFinal === undefined) ||
      (!!physicalLeftFinal && !propertyReturnHandledConfirmed) ||
      isSaving,
  };
}
