import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearStoredWorkMode,
  getWorkModeFromPath,
  readStoredWorkMode,
  writeStoredWorkMode,
} from './workMode';

describe('getWorkModeFromPath', () => {
  it('returns FIELD for /holds and children', () => {
    expect(getWorkModeFromPath('/holds')).toBe('FIELD');
    expect(getWorkModeFromPath('/holds/42')).toBe('FIELD');
  });

  it('returns FIELD for /incident', () => {
    expect(getWorkModeFromPath('/incident')).toBe('FIELD');
    expect(getWorkModeFromPath('/incident/new')).toBe('FIELD');
  });

  it('returns CUSTODY for /custody and children', () => {
    expect(getWorkModeFromPath('/custody')).toBe('CUSTODY');
    expect(getWorkModeFromPath('/custody/abc')).toBe('CUSTODY');
  });

  it('returns FIELD for /forms and children', () => {
    expect(getWorkModeFromPath('/forms')).toBe('FIELD');
    expect(getWorkModeFromPath('/forms/intake/abc')).toBe('FIELD');
  });

  it('does not match prefix-bleed paths', () => {
    expect(getWorkModeFromPath('/holdsfoo')).toBeNull();
    expect(getWorkModeFromPath('/custodyroom')).toBeNull();
    expect(getWorkModeFromPath('/incidentish')).toBeNull();
  });

  it('returns null for other paths', () => {
    expect(getWorkModeFromPath('/profile')).toBeNull();
    expect(getWorkModeFromPath('/')).toBeNull();
    expect(getWorkModeFromPath('/care')).toBeNull();
  });
});

describe('stored work mode', () => {
  beforeEach(() => {
    const store = new Map();
    globalThis.sessionStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      clear: () => { store.clear(); },
    };
  });

  it('round-trips a FIELD value', () => {
    writeStoredWorkMode('FIELD');
    expect(readStoredWorkMode()).toBe('FIELD');
  });

  it('round-trips a CUSTODY value', () => {
    writeStoredWorkMode('CUSTODY');
    expect(readStoredWorkMode()).toBe('CUSTODY');
  });

  it('ignores invalid values on write', () => {
    writeStoredWorkMode('BOGUS');
    expect(readStoredWorkMode()).toBeNull();
  });

  it('returns null when nothing stored', () => {
    expect(readStoredWorkMode()).toBeNull();
  });

  it('clearStoredWorkMode removes the value', () => {
    writeStoredWorkMode('FIELD');
    clearStoredWorkMode();
    expect(readStoredWorkMode()).toBeNull();
  });

  it('treats unexpected stored values as null', () => {
    globalThis.sessionStorage.setItem('cc:workMode', 'JUNK');
    expect(readStoredWorkMode()).toBeNull();
  });
});
