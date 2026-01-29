import { describe, expect, it, afterEach } from 'vitest';

import { buildAddressQuery, getMapLink } from './FacilityAddressLink';

const address = '123 Main St, San Francisco, CA';
const encodedAddress = encodeURIComponent(address);
const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

const setNavigator = (userAgent) => {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent },
    configurable: true,
  });
};

const restoreNavigator = () => {
  if (typeof originalNavigator === 'undefined') {
    delete globalThis.navigator;
    return;
  }

  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    configurable: true,
  });
};

const originalNavigator = globalThis.navigator;

afterEach(() => {
  restoreNavigator();
});

describe('getMapLink', () => {
  it('returns Google Maps link when navigator is undefined', () => {
    delete globalThis.navigator;

    expect(getMapLink(address)).toBe(googleMapsLink);
  });

  it('returns Apple Maps link on iOS', () => {
    setNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');

    expect(getMapLink(address)).toBe(`https://maps.apple.com/?q=${encodedAddress}`);
  });

  it('returns geo link on Android', () => {
    setNavigator('Mozilla/5.0 (Linux; Android 14; Pixel 8)');

    expect(getMapLink(address)).toBe(`geo:0,0?q=${encodedAddress}`);
  });

  it('returns Google Maps link on desktop', () => {
    setNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)');

    expect(getMapLink(address)).toBe(googleMapsLink);
  });
});

describe('buildAddressQuery', () => {
  it('uses fallback locality when all parts are empty', () => {
    expect(buildAddressQuery({})).toBe('San Francisco, CA');
  });

  it('builds a query from address parts', () => {
    expect(buildAddressQuery({
      addressLine1: '444 6th St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
    })).toBe('444 6th St, San Francisco, CA, 94103');
  });

  it('uses zip when postalCode is not provided', () => {
    expect(buildAddressQuery({
      addressLine1: '444 6th St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: null,
      zip: '94103',
    })).toBe('444 6th St, San Francisco, CA, 94103');
  });

  it('uses fallback locality when parts are incomplete and line address lacks locality', () => {
    expect(buildAddressQuery({ addressLine1: '444 6th St' }))
      .toBe('444 6th St, San Francisco, CA');
  });

  it('does not append fallback when line1 contains a comma', () => {
    expect(buildAddressQuery({ addressLine1: '444 6th St, Oakland' }))
      .toBe('444 6th St, Oakland');
  });
});
