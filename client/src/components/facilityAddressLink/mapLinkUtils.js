export function buildAddressQuery ({
  locationType,
  addressLine1,
  addressLine2,
  city,
  state,
  postalCode,
  zip,
  street1,
  street2,
} = {}) {
  if (locationType === 'INTERSECTION' && (street1 || street2)) {
    const s1 = (street1 ?? '').toString().trim();
    const s2 = (street2 ?? '').toString().trim();
    const intersection = [s1, s2].filter(Boolean).join(' & ');
    const cityValue = (city ?? 'San Francisco').toString().trim();
    const stateValue = (state ?? 'CA').toString().trim();
    const locality = [cityValue, stateValue].filter(Boolean).join(', ');
    return [intersection, locality].filter(Boolean).join(', ') || null;
  }

  const hasLocalityInAddress = (value) => {
    const normalized = (value ?? '').toString().trim();

    return Boolean(normalized && normalized.includes(','));
  };

  const line1 = (addressLine1 ?? '').toString().trim();
  const line2 = (addressLine2 ?? '').toString().trim();
  const cityValue = (city ?? '').toString().trim();
  const stateValue = (state ?? '').toString().trim();
  const hasCityOrState = Boolean(cityValue || stateValue);
  const fallbackLocality = 'San Francisco, CA';
  const useFallbackLocality = !hasCityOrState && !hasLocalityInAddress(line1);
  const locality = [cityValue, stateValue, useFallbackLocality ? fallbackLocality : '']
    .filter(Boolean)
    .join(', ');
  const postal = (postalCode ?? zip ?? '').toString().trim();

  const candidate = [line1, line2, locality, postal].filter(Boolean).join(', ');

  return candidate || null;
}

export const getMapLink = (query) => {
  const encodedAddress = encodeURIComponent(query);

  if (typeof navigator === 'undefined') {
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }

  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);

  if (isIOS) {
    return `https://maps.apple.com/?q=${encodedAddress}`;
  }

  if (isAndroid) {
    return `geo:0,0?q=${encodedAddress}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
};
