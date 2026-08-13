/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isChunkLoadError, reloadOnceForStaleChunk } from './chunkReload';

describe('isChunkLoadError', () => {
  it('matches the dynamic-import fetch failures browsers throw for stale chunks', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://x/assets/AdminRoutes-abc.js'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true); // Safari
  });

  it('does not match unrelated errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('reloadOnceForStaleChunk (loop guard)', () => {
  let reloadMock;

  beforeEach(() => {
    window.sessionStorage.clear();
    reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadMock },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reloads on the first stale-chunk error and records the attempt', () => {
    const didReload = reloadOnceForStaleChunk();

    expect(didReload).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('chunkReloadAt')).toBeTruthy();
  });

  it('does NOT reload again within the window — prevents an infinite loop', () => {
    reloadOnceForStaleChunk(); // first attempt reloads
    reloadMock.mockClear();

    const didReload = reloadOnceForStaleChunk(); // immediate second attempt

    expect(didReload).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('reloads again once the window has elapsed (e.g. a later deploy)', () => {
    reloadOnceForStaleChunk();
    reloadMock.mockClear();

    // Simulate the previous reload happening well outside the 10s window.
    window.sessionStorage.setItem('chunkReloadAt', String(Date.now() - 20_000));

    const didReload = reloadOnceForStaleChunk();

    expect(didReload).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
