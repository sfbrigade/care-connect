export function getSfpdDocuments ({ deflection, view647fForm, download647fForm }) {
  const isCustodyTransferred = [
    'AWAITING_INTAKE',
    'READY_FOR_INTAKE',
    'FAILED_INTAKE',
    'IN_MEDICAL_INTAKE',
    'IN_CHAIR',
    'RELEASED',
    'EXITED',
    'DEATH_IN_FACILITY',
    'DEATH_IN_CUSTODY',
  ].includes(deflection?.subjectStatus);
  const doc647f = deflection?.deflectionDocuments?.find(d => d.formId === '647f');

  if (!isCustodyTransferred || !deflection?.transferredAt || !doc647f) {
    return [];
  }

  return [{
    id: '647f',
    title: '647(f)',
    updatedAt: doc647f.updatedAt,
    actions: {
      view: view647fForm,
      download: download647fForm,
    },
  }];
}
