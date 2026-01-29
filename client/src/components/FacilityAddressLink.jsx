export function buildAddressQuery ({
  address,
  addressLine1,
  addressLine2,
  city,
  state,
  postalCode,
  zip,
  country,
  query,
} = {}) {
  const explicitQuery = (query ?? '').toString().trim();
  if (explicitQuery) {
    return explicitQuery;
  }

  const hasLocalityInAddress = (value) => {
    if (!value) {
      return false;
    }

    const normalized = value.toString().trim();
    if (!normalized) {
      return false;
    }

    return (
      /,\s*[A-Z]{2}\b/.test(normalized) ||
      /\bCalifornia\b/i.test(normalized) ||
      /\bCA\b/.test(normalized) ||
      /\bSan Francisco\b/i.test(normalized)
    );
  };

  const line1 = (addressLine1 ?? '').toString().trim();
  const line2 = (addressLine2 ?? '').toString().trim();
  const cityValue = (city ?? '').toString().trim();
  const stateValue = (state ?? '').toString().trim();
  const hasCityOrState = Boolean(cityValue || stateValue);
  const fallbackLocality = 'San Francisco, CA';
  const combinedAddressInput = [line1, line2, address].filter(Boolean).join(', ');
  const useFallbackLocality = !hasCityOrState && !hasLocalityInAddress(combinedAddressInput);
  const locality = [
    cityValue,
    stateValue,
    useFallbackLocality ? fallbackLocality : '',
  ]
    .filter(Boolean)
    .join(', ');
  const postal = (postalCode ?? zip ?? '').toString().trim();
  const nation = (country ?? '').toString().trim();

  const candidate = [
    line1,
    line2,
    locality,
    postal,
    nation,
  ].filter(Boolean).join(', ');

  const fallback = (address ?? '').toString().trim();

  if (candidate) {
    return candidate;
  }

  if (fallback) {
    return hasCityOrState || hasLocalityInAddress(fallback)
      ? fallback
      : [fallback, fallbackLocality].join(', ');
  }

  return null;
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

export default function FacilityAddressLink ({
  address,
  addressLine1,
  addressLine2,
  city,
  state,
  postalCode,
  zip,
  country,
  query,
  children,
  className,
  style,
  stopPropagation = false,
}) {
  const mapQuery = buildAddressQuery({
    address,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    zip,
    country,
    query,
  });

  if (!mapQuery) {
    return null;
  }

  const mapLink = getMapLink(mapQuery);
  const fallbackDisplay = [addressLine1, addressLine2].filter(Boolean).join(', ');
  const displayText = children ?? address ?? fallbackDisplay ?? mapQuery;

  return (
    <a
      href={mapLink}
      target={mapLink.startsWith('http') ? '_blank' : undefined}
      rel={mapLink.startsWith('http') ? 'noreferrer' : undefined}
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      className={className}
      style={{
        color: '#1a73e8',
        textDecoration: 'none',
        ...style,
      }}
    >
      {displayText}
    </a>
  );
}
