export function getCustodyStatusChip (deflection) {
  switch (deflection?.subjectStatus) {
    case 'AWAITING_INTAKE':
      return { label: 'Pending safety check', tone: 'info' };
    case 'READY_FOR_INTAKE':
      return { label: 'Ready for medical intake', tone: 'info' };
    case 'IN_MEDICAL_INTAKE':
      return { label: 'In medical intake', tone: 'info' };
    case 'IN_CHAIR':
      return { label: 'Awaiting legal release', tone: 'info' };
    case 'FAILED_INTAKE':
      return { label: 'Refused admission', tone: 'danger' };
    case 'RELEASED':
      return { label: 'Legally released', tone: 'success' };
    case 'EXITED':
      return { label: 'Physical exit recorded', tone: 'success' };
    default:
      return null;
  }
}
