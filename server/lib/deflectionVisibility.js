const CARE_ALLOWED_SUBJECT_FIELDS = new Set([
  'firstName',
  'lastName',
  'middleInitial',
  'dateOfBirth',
  'sex',
  'race',
  'driverLicense',
  // These are model-required metadata fields; keep them stable for existing response contracts.
  'id',
  'createdAt',
  'updatedAt',
]);

export function canReadDeflection (user, deflection) {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (user.isCustody || user.isCare) return true;
  return deflection?.createdById === user.id || deflection?.currentOfficerId === user.id;
}

function redactSubjectForCare (subject) {
  if (!subject) return subject;

  const redactedSubject = { ...subject };
  for (const key of Object.keys(redactedSubject)) {
    if (!CARE_ALLOWED_SUBJECT_FIELDS.has(key)) {
      redactedSubject[key] = null;
    }
  }
  return redactedSubject;
}

export function redactDeflectionForUser (deflection, user) {
  if (!deflection || !user?.isCare) return deflection;
  return {
    ...deflection,
    subject: redactSubjectForCare(deflection.subject),
  };
}

export function redactDeflectionsForUser (deflections, user) {
  if (!Array.isArray(deflections) || !user?.isCare) return deflections;
  return deflections.map((deflection) => redactDeflectionForUser(deflection, user));
}
