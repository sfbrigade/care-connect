export const PROPERTY_RETURN_REASON_LABELS = {
  ABANDONED: 'Abandoned',
  DESTROYED: 'Destroyed',
  OTHER: 'Other',
};

export function hasAssociatedProperty (deflection) {
  return Boolean(
    (deflection?.property && deflection.property !== 'NONE') ||
    deflection?.propertyDetails?.trim() ||
    (deflection?.propertyPhotos?.length ?? 0) > 0
  );
}

export function shouldShowPropertyReturnEntryPoint ({ viewerMode, isCustody, deflection }) {
  const isCareView = viewerMode === 'care';
  const isLegallyReleased = deflection?.subjectStatus === 'RELEASED';
  const hasPropertyReturnStatus = deflection?.propertyReturned === true || deflection?.propertyReturned === false;

  return !isCareView && isCustody && isLegallyReleased && hasAssociatedProperty(deflection) && !hasPropertyReturnStatus;
}

export function getPropertyReturnStatusText (deflection) {
  if (deflection?.propertyReturned === true) {
    return 'Property returned to the person';
  }

  if (deflection?.propertyReturned === false) {
    const reason = deflection?.propertyNotReturnedReason === 'OTHER'
      ? (deflection?.propertyNotReturnedOtherReason || 'Other')
      : (PROPERTY_RETURN_REASON_LABELS[deflection?.propertyNotReturnedReason] || 'Not specified');
    return `Property not returned (${reason})`;
  }

  return null;
}

export function canConfirmPropertyReturn ({ propertyReturnedSelection, propertyNotReturnedReason, propertyNotReturnedOtherReason }) {
  const requiresReason = propertyReturnedSelection === 'no';
  const requiresOtherReason = requiresReason && propertyNotReturnedReason === 'OTHER';

  return propertyReturnedSelection === 'yes' ||
    (requiresReason && !!propertyNotReturnedReason && (!requiresOtherReason || !!propertyNotReturnedOtherReason.trim()));
}

export function getPropertyReturnErrorToast (error) {
  const isAlreadyRecorded = error?.response?.status === 409 && error?.response?.data?.code === 'ALREADY_RECORDED';

  if (isAlreadyRecorded) {
    return {
      title: 'This property was already returned',
      variant: 'warning',
      timeout: 4000,
    };
  }

  return {
    title: 'Property return update failed',
    variant: 'error',
    timeout: 4000,
    body: 'Please try again later.',
  };
}
