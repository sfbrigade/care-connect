import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';

import { formatDocumentUpdatedAt } from './DocumentsSection.jsx';

describe('formatDocumentUpdatedAt', () => {
  const now = DateTime.fromISO('2026-06-10T12:00:00.000-07:00');

  it('formats documents updated today with only the time', () => {
    expect(formatDocumentUpdatedAt('2026-06-10T09:24:00.000-07:00', now)).toBe('9:24 AM');
  });

  it('formats documents updated yesterday with Yesterday and the time', () => {
    expect(formatDocumentUpdatedAt('2026-06-09T09:24:00.000-07:00', now)).toBe('Yesterday, 9:24 AM');
  });

  it('formats older document updates with month, day, and time', () => {
    expect(formatDocumentUpdatedAt('2026-04-29T09:24:00.000-07:00', now)).toBe('April 29, 9:24 AM');
  });
});
