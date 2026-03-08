export function shouldShowCareCardViewDetails (deflection) {
  return !(deflection?.subjectStatus === 'EXITED' && deflection?.exitDestinationId === 'jail');
}

export function groupCareNotInCustodySections (deflections = []) {
  return {
    STILL_ONSITE: deflections.filter(d => d.subjectStatus === 'RELEASED'),
    EXITED_FACILITY: deflections.filter(
      d => d.subjectStatus === 'EXITED' && d.exitDestinationId !== 'jail'
    ),
    TRANSFERRED_TO_JAIL: deflections.filter(
      d => d.subjectStatus === 'EXITED' && d.exitDestinationId === 'jail'
    ),
  };
}

export function getCareExitBackTo ({ fromDetail, id, savedTab }) {
  if (fromDetail) return `/care/${id}`;
  return savedTab === 'not-in-custody' ? '/care?tab=not-in-custody' : '/care';
}

export function getCareExitSuccessPayload (deflectionId) {
  return {
    highlightTarget: String(deflectionId),
    navigateTo: '/care?tab=not-in-custody',
    toastTitle: 'Exit recorded',
    toastBody: 'Person now appears in Exited facility under Not in custody (last 24 hours).',
  };
}
