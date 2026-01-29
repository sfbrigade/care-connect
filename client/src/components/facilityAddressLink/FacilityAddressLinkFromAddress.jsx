import MapLinkAnchor from './MapLinkAnchor';
import { getMapLink } from './mapLinkUtils';

export default function FacilityAddressLinkFromAddress({
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

