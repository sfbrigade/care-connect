import { describe, expect, it } from 'vitest';

import {
  canConfirmPropertyReturn,
  getPropertyReturnErrorToast,
  getPropertyReturnStatusText,
  hasAssociatedProperty,
  shouldShowPropertyReturnEntryPoint,
} from './propertyReturnUtils';

describe('propertyReturnUtils', () => {
  it('detects associated property from volume/details/photos', () => {
    expect(hasAssociatedProperty({ property: 'SMALL', propertyDetails: null, propertyPhotos: [] })).toBe(true);
    expect(hasAssociatedProperty({ property: null, propertyDetails: 'Bag', propertyPhotos: [] })).toBe(true);
    expect(hasAssociatedProperty({ property: null, propertyDetails: null, propertyPhotos: [{ id: 1 }] })).toBe(true);
    expect(hasAssociatedProperty({ property: 'NONE', propertyDetails: null, propertyPhotos: [] })).toBe(false);
  });

  it('shows property return entry point only for custody + released + unrecorded + property', () => {
    const baseDeflection = {
      subjectStatus: 'RELEASED',
      property: 'SMALL',
      propertyDetails: null,
      propertyPhotos: [],
      propertyReturned: null,
    };

    expect(shouldShowPropertyReturnEntryPoint({ viewerMode: 'custody', isCustody: true, deflection: baseDeflection })).toBe(true);
    expect(shouldShowPropertyReturnEntryPoint({ viewerMode: 'care', isCustody: true, deflection: baseDeflection })).toBe(false);
    expect(shouldShowPropertyReturnEntryPoint({ viewerMode: 'custody', isCustody: false, deflection: baseDeflection })).toBe(false);
    expect(shouldShowPropertyReturnEntryPoint({ viewerMode: 'custody', isCustody: true, deflection: { ...baseDeflection, propertyReturned: true } })).toBe(false);
  });

  it('builds property return status text for yes/no outcomes', () => {
    expect(getPropertyReturnStatusText({ propertyReturned: true })).toBe('Property returned to the person');
    expect(getPropertyReturnStatusText({ propertyReturned: false, propertyReturnReason: 'ABANDONED' })).toBe('Property not returned (Abandoned)');
    expect(getPropertyReturnStatusText({ propertyReturned: false, propertyReturnReason: 'OTHER', propertyReturnOtherReason: 'Evidence' })).toBe('Property not returned (Evidence)');
    expect(getPropertyReturnStatusText({ propertyReturned: null })).toBe(null);
  });

  it('enables confirm only when selections/reason requirements are satisfied', () => {
    expect(canConfirmPropertyReturn({ returnedSelection: null, reason: null, otherReason: '' })).toBe(false);
    expect(canConfirmPropertyReturn({ returnedSelection: 'yes', reason: null, otherReason: '' })).toBe(true);
    expect(canConfirmPropertyReturn({ returnedSelection: 'no', reason: null, otherReason: '' })).toBe(false);
    expect(canConfirmPropertyReturn({ returnedSelection: 'no', reason: 'ABANDONED', otherReason: '' })).toBe(true);
    expect(canConfirmPropertyReturn({ returnedSelection: 'no', reason: 'OTHER', otherReason: '' })).toBe(false);
    expect(canConfirmPropertyReturn({ returnedSelection: 'no', reason: 'OTHER', otherReason: 'Held by SFPD' })).toBe(true);
  });

  it('maps API errors to requested toast copy', () => {
    expect(getPropertyReturnErrorToast({
      response: {
        status: 409,
        data: { code: 'ALREADY_RECORDED' },
      },
    })).toEqual({
      title: 'This property was already returned',
      variant: 'warning',
      timeout: 4000,
    });

    expect(getPropertyReturnErrorToast(new Error('network'))).toEqual({
      title: 'Property return update failed',
      variant: 'error',
      timeout: 4000,
      body: 'Please try again later.',
    });
  });
});
