import { Anchor } from '@mantine/core';

export const getMapLink = (address) => {
  const encodedAddress = encodeURIComponent(address);

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
    <Anchor
      href={mapLink}
      target={mapLink.startsWith('http') ? '_blank' : undefined}
      rel={mapLink.startsWith('http') ? 'noreferrer' : undefined}
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      className={className}
      style={style}
    >
      {children ?? address}
    </Anchor>
  );
}
