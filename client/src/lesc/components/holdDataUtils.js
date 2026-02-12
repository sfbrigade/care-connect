export function hasMeaningfulHoldData (deflection) {
  if (!deflection) {
    return false;
  }

  return Boolean(
    deflection.subjectId ||
    deflection.narcoticsSubstance !== null ||
    deflection.narcoticsParaphernalia !== null ||
    deflection.behavior ||
    deflection.property ||
    deflection.propertyDetails ||
    deflection.deflectionDetails?.length ||
    deflection.propertyPhotos?.length
  );
}
