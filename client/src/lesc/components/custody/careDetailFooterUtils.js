const EXIT_DRAFT_STORAGE_KEY = 'careExitDraftByDeflectionId';

function hasSavedExitDraft (deflectionId) {
  if (typeof window === 'undefined') return false;
  try {
    const draftMap = JSON.parse(window.localStorage.getItem(EXIT_DRAFT_STORAGE_KEY) || '{}');
    return Boolean(draftMap?.[String(deflectionId)]?.exitDetailsSaved);
  } catch {
    return false;
  }
}

function hasPersistedExitDetails (deflection) {
  return Boolean(
    deflection?.exitDestinationId &&
    deflection?.exitHousingStatusId &&
    deflection?.exitConnectedToCare &&
    deflection?.exitSFResident
  );
}

export function getCareDetailFooterState ({ viewerMode, deflection }) {
  if (viewerMode !== 'care') {
    return { showFooter: false };
  }

  const startExitPath = deflection?.id ? `/care/${deflection.id}/exit?from=detail` : null;

  if (deflection?.subjectStatus === 'ADMITTED') {
    return {
      showFooter: true,
      primaryLabel: 'Complete intake',
      primaryAction: 'complete-intake',
      startExitPath,
    };
  }

  if (deflection?.subjectStatus === 'RELEASED') {
    const hasExitDraft = hasSavedExitDraft(deflection?.id);
    const hasExitDetails = hasExitDraft || hasPersistedExitDetails(deflection);
    return {
      showFooter: true,
      primaryLabel: hasExitDetails ? 'Finish exit' : 'Start exit',
      primaryAction: 'start-exit',
      startExitPath,
    };
  }

  return { showFooter: false };
}
