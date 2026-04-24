const STORAGE_KEY = 'cc:workMode';

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

export function readStoredWorkMode () {
  try {
    const v = globalThis.sessionStorage?.getItem(STORAGE_KEY);
    return v === 'FIELD' || v === 'CUSTODY' ? v : null;
  } catch {
    return null;
  }
}

export function writeStoredWorkMode (mode) {
  try {
    if (mode === 'FIELD' || mode === 'CUSTODY') {
      globalThis.sessionStorage?.setItem(STORAGE_KEY, mode);
    }
  } catch { /* swallow — storage unavailable */ }
}

export function clearStoredWorkMode () {
  try {
    globalThis.sessionStorage?.removeItem(STORAGE_KEY);
  } catch { /* swallow */ }
}
