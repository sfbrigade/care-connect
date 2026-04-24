import { describe, expect, it } from 'vitest';
import { getWorkModeFromPath } from './workMode';

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
