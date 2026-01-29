export function buildAddressQuery ({
  addressLine1,
  addressLine2,
  city,
  state,
  postalCode,
} = {}) {
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
  const locality = [
    cityValue,
    stateValue,
    useFallbackLocality ? fallbackLocality : '',
  ]
    .filter(Boolean)
    .join(', ');
  const postal = (postalCode ?? '').toString().trim();

  const candidate = [
    line1,
    line2,
    locality,
    postal,
  ].filter(Boolean).join(', ');

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

function MapLinkAnchor ({
  href,
  stopPropagation = false,
  className,
  style,
  children,
}) {
  const isHttpLink = href.startsWith('http');

  return (
    <a
      href={href}
      target={isHttpLink ? '_blank' : undefined}
      rel={isHttpLink ? 'noreferrer' : undefined}
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      className={className}
      style={{
        color: '#1a73e8',
        textDecoration: 'none',
        ...style,
      }}
    >
      {children}
    </a>
  );
}

export default function FacilityAddressLinkFromParts ({
  addressLine1,
  addressLine2,
  city,
  state,
  postalCode,
  children,
  className,
  style,
  stopPropagation = false,
}) {
  const mapQuery = buildAddressQuery({
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
  });

  if (!mapQuery) {
    return null;
  }

  const mapLink = getMapLink(mapQuery);
  const fallbackDisplay = [addressLine1, addressLine2].filter(Boolean).join(', ');
  const displayText = children ?? fallbackDisplay ?? mapQuery;

  return (
    <MapLinkAnchor
      href={mapLink}
      stopPropagation={stopPropagation}
      className={className}
      style={style}
    >
      {displayText}
    </MapLinkAnchor>
  );
}

export function FacilityAddressLinkFromAddress ({
  address,
  children,
  className,
  style,
  stopPropagation = false,
}) {
  if (!address) {
    return null;
  }

  const mapLink = getMapLink(address);

  return (
    <MapLinkAnchor
      href={mapLink}
      stopPropagation={stopPropagation}
      className={className}
      style={style}
    >
      {children}
    </MapLinkAnchor>
  );
}

