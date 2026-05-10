/**
 * Fetch a file and trigger a download via a blob URL.
 *
 * Avoids two failure modes of `<a href={url} download>`:
 * - Cross-origin URLs (e.g. S3 fileUrls): the download attribute is
 *   silently ignored and the anchor click navigates the current tab to
 *   the URL.
 * - PWA scope capture: in a standalone PWA on Android, in-scope link
 *   clicks (even with target="_blank") get captured into a new PWA
 *   instance that doesn't inherit the SameSite=Strict session cookie →
 *   401 with no UI to escape.
 *
 * Fetching to a blob URL sidesteps both: the fetch carries the cookie,
 * the blob: URL is treated as same-origin so `download` is honored, and
 * no top-level navigation happens.
 */
export async function openInBrowser (url, filename) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
