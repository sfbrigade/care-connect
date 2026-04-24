function startsWithBase (pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function getWorkModeFromPath (pathname) {
  if (startsWithBase(pathname, '/custody')) return 'CUSTODY';
  if (
    startsWithBase(pathname, '/holds') ||
    startsWithBase(pathname, '/incident') ||
    startsWithBase(pathname, '/forms')
  ) return 'FIELD';
  return null;
}
