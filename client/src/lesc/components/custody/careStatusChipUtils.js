export function getCareStatusChip ({ deflection, careFooterState }) {
  switch (deflection?.subjectStatus) {
    case 'IN_MEDICAL_INTAKE':
      return { label: 'In medical intake', tone: 'info' };
    case 'IN_CHAIR':
      return { label: 'Awaiting legal release', tone: 'info' };
    case 'RELEASED':
      return careFooterState?.primaryLabel === 'Finish exit'
        ? { label: 'Still onsite', tone: 'info' }
        : { label: 'Ready for exit', tone: 'info' };
    case 'EXITED':
      return { label: 'Physical exit recorded', tone: 'success' };
    default:
      return null;
  }
}
