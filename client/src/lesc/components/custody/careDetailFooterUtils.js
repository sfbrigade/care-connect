import { hasSavedExitDraft } from '../care/careFlowUtils';

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

  if (deflection?.subjectStatus === 'IN_MEDICAL_INTAKE') {
    return {
      showFooter: true,
      primaryLabel: 'Update intake status',
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
