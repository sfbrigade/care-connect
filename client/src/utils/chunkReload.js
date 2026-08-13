// Recovery for the "stale chunk after deploy" failure.
//
// The app is code-split into content-hashed chunks (e.g. AdminRoutes-<hash>.js).
// A browser session left open across a deploy keeps running the old build's JS,
// which references old chunk filenames. Navigating to a not-yet-loaded lazy route
// then fetches a URL that 404s, throwing "Failed to fetch dynamically imported
// module". Because index.html is served no-cache, a single full reload pulls the
// current build's HTML + chunk hashes and recovers.
//
// The guard makes reloading safe: it reloads at most once per RELOAD_WINDOW_MS, so
// a chunk that genuinely can't be fetched (offline, or a broken deploy) can't cause
// a reload loop — after one attempt the caller shows a static "refresh" fallback
// instead. The marker lives in sessionStorage because a reload wipes in-memory
// state; it's scoped to the tab and clears when the tab closes.

const RELOAD_MARKER = 'chunkReloadAt';
const RELOAD_WINDOW_MS = 10_000;

// True for the errors browsers throw when a dynamic import() / modulepreload can't
// be fetched or parsed (i.e. a code-split chunk that no longer exists after a deploy).
export function isChunkLoadError (error) {
  const message = (error && (error.message || String(error))) || '';
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) // Safari's wording
  );
}

// Reload once to pick up the current build. Returns true if it triggered a reload,
// or false if we already reloaded within the window — in which case the caller
// should surface a fallback rather than loop.
export function reloadOnceForStaleChunk () {
  let lastReloadAt = 0;
  try {
    lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_MARKER)) || 0;
  } catch {
    // sessionStorage can throw in some privacy modes; treat as "not reloaded yet".
  }

  if (Date.now() - lastReloadAt < RELOAD_WINDOW_MS) {
    return false; // already reloaded very recently — don't loop
  }

  try {
    window.sessionStorage.setItem(RELOAD_MARKER, String(Date.now()));
  } catch {
    // ignore — a failed write just means the next error may reload again
  }
  window.location.reload();
  return true;
}
