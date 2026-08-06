function isTransferredToJail (deflection) {
  return (
    deflection?.subjectStatus === 'EXITED' &&
    deflection?.exitDestination === 'JAIL'
  );
}

function isTransferredToHospital (deflection) {
  return (
    deflection?.subjectStatus === 'EXITED' &&
    deflection?.exitDestination === 'HOSPITAL_EMS' &&
    !deflection?.releasedAt
  );
}

export function shouldShowCareCardViewDetails (deflection) {
  return ['IN_MEDICAL_INTAKE', 'IN_CHAIR', 'RELEASED', 'EXITED'].includes(deflection?.subjectStatus);
}

export function hasPersistedExitDetails (deflection) {
  return Boolean(
    deflection?.exitDestination &&
    deflection?.exitHousingStatus &&
    deflection?.exitConnectedToCare &&
    deflection?.exitSFResident
  );
}

export const EXIT_DRAFT_STORAGE_KEY = 'careExitDraftByDeflectionId';

export function getSavedExitDraftMap () {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(EXIT_DRAFT_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function hasSavedExitDraft (deflectionId) {
  const draft = getSavedExitDraftMap()?.[String(deflectionId)];
  return Boolean(draft?.exitFormEdited || draft?.exitDetailsSaved);
}

export function getSavedExitDraft (deflectionId) {
  return getSavedExitDraftMap()?.[String(deflectionId)] ?? null;
}

export function setSavedExitDraft (deflectionId, draft) {
  if (typeof window === 'undefined' || !deflectionId) return;
  const draftMap = getSavedExitDraftMap();
  const key = String(deflectionId);

  if (draft) {
    window.localStorage.setItem(EXIT_DRAFT_STORAGE_KEY, JSON.stringify({
      ...draftMap,
      [key]: {
        ...draftMap[key],
        ...draft,
        exitFormEdited: true,
      },
    }));
    return;
  }

  const { [key]: _removed, ...nextDraftMap } = draftMap;
  window.localStorage.setItem(EXIT_DRAFT_STORAGE_KEY, JSON.stringify(nextDraftMap));
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
