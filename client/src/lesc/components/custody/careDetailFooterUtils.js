export function getCareDetailFooterState ({ viewerMode, deflection }) {
  const showFooter = viewerMode === 'care';
  const overflowDisabled = deflection?.subjectStatus === 'IN_CHAIR';
  const startExitPath = deflection?.id ? `/care/${deflection.id}/exit?from=detail` : null;
  return { showFooter, overflowDisabled, startExitPath };
}
