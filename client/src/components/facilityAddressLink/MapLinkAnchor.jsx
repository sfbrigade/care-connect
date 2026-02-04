import { Anchor } from '@mantine/core';

export default function MapLinkAnchor ({
  href,
  stopPropagation = false,
  className,
  style,
  children,
}) {
  const isHttpLink = href.startsWith('http');

  return (
    <Anchor
      href={href}
      target={isHttpLink ? '_blank' : undefined}
      rel={isHttpLink ? 'noreferrer' : undefined}
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      className={className}
      style={style}
    >
      {children}
    </Anchor>
  );
}
