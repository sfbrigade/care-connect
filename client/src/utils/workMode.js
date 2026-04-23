export function getWorkModeFromPath (pathname) {
  if (pathname.startsWith('/custody')) return 'CUSTODY';
  if (pathname.startsWith('/holds') || pathname.startsWith('/incident')) return 'FIELD';
  return null;
}
