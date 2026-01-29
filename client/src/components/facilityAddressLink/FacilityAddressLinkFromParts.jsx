import MapLinkAnchor from './MapLinkAnchor';
import { buildAddressQuery, getMapLink } from './mapLinkUtils';

export default function FacilityAddressLinkFromParts({
  addressLine1,
  addressLine2,
  city,
  state,
  postalCode,
  zip,
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
    zip,
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

