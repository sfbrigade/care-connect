export default function MapLinkAnchor({
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

