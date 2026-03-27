import { describe, it, expect } from 'vitest';

import {
  SFPD_ACTIVE_SUBJECT_STATUSES,
  SFPD_HISTORY_ACTIVE_SUBJECT_STATUSES,
  buildAdminCancelledHoldsMessage,
  buildIncidentSubtitle,
  buildAutoCancelledHoldsMessage,
  detectAdminCancelledHolds,
  detectAutoCancelledExpiredHolds,
  getExpiredDeflectionsForIncident,
  getDeflectionActivityMs,
  groupDeflectionsByIncident,
  isInitialLoading,
  mergeHistoryDeflections,
  shouldShowIncidentInActive,
  shouldShowTransferredHoldsPrompt,
  splitCurrentIncidentDeflections,
} from './holdsViewModel';

function deflection (overrides = {}) {
  return {
    id: 1,
    incidentId: 1,
    createdAt: '2026-02-27T09:00:00.000Z',
    updatedAt: '2026-02-27T09:00:00.000Z',
    ...overrides,
  };
}

describe('holdsViewModel', () => {
  it('exports the expected SFPD subject status filters', () => {
    expect(SFPD_ACTIVE_SUBJECT_STATUSES).toBe('DETAINED,ONSITE_AWAITING_TRANSFER');
    expect(SFPD_HISTORY_ACTIVE_SUBJECT_STATUSES).toBe('AWAITING_INTAKE,READY_FOR_INTAKE,ADMITTED,IN_CHAIR,RELEASED,EXITED');
  });

  it('merges and deduplicates history deflections by id, sorted by createdAt desc', () => {
    const inactive = [
      deflection({ id: 1, createdAt: '2026-02-27T09:00:00.000Z', subjectStatus: 'EXITED' }),
      deflection({ id: 2, createdAt: '2026-02-27T10:00:00.000Z', subjectStatus: 'EXITED' }),
    ];
    const postTransfer = [
      deflection({ id: 3, createdAt: '2026-02-27T11:00:00.000Z', subjectStatus: 'AWAITING_INTAKE' }),
      deflection({ id: 2, createdAt: '2026-02-27T10:00:00.000Z', subjectStatus: 'READY_FOR_INTAKE' }),
    ];

    const merged = mergeHistoryDeflections(inactive, postTransfer);

    expect(merged.map((d) => d.id)).toEqual([3, 2, 1]);
    expect(merged.find((d) => d.id === 2)?.subjectStatus).toBe('READY_FOR_INTAKE');
  });

  it('returns active incident visibility only when there is an incident and active deflections', () => {
    expect(shouldShowIncidentInActive(null, [deflection()])).toBe(false);
    expect(shouldShowIncidentInActive({ id: 1 }, [])).toBe(false);
    expect(shouldShowIncidentInActive({ id: 1 }, [deflection()])).toBe(true);
  });

  it('shows the transferred-holds prompt only after arrival when no active holds remain', () => {
    expect(shouldShowTransferredHoldsPrompt(null, [])).toBe(false);
    expect(shouldShowTransferredHoldsPrompt({ id: 1 }, [])).toBe(false);
    expect(shouldShowTransferredHoldsPrompt({ id: 1, arrivedAt: '2026-02-27T09:00:00.000Z' }, [deflection()])).toBe(false);
    expect(shouldShowTransferredHoldsPrompt({ id: 1, arrivedAt: '2026-02-27T09:00:00.000Z' }, [])).toBe(true);
    expect(shouldShowTransferredHoldsPrompt({ id: 1, arrivedAt: '2026-02-27T09:00:00.000Z', leftAt: '2026-02-27T10:00:00.000Z' }, [])).toBe(false);
  });

  it('detects initial loading without treating background refetch as initial', () => {
    expect(isInitialLoading(true, undefined)).toBe(true);
    expect(isInitialLoading(true, [])).toBe(false);
    expect(isInitialLoading(false, undefined)).toBe(false);
  });

  it('returns expired deflections for the current incident only', () => {
    const expired = getExpiredDeflectionsForIncident([
      deflection({ id: 1, incidentId: 100, status: 'EXPIRED' }),
      deflection({ id: 2, incidentId: 100, status: 'CANCELLED' }),
      deflection({ id: 3, incidentId: 200, status: 'EXPIRED' }),
    ], 100);

    expect(expired.map((d) => d.id)).toEqual([1]);
  });

  it('builds singular and plural auto-cancel copy', () => {
    expect(buildAutoCancelledHoldsMessage(1)).toBe('1 hold was auto-canceled because it expired.');
    expect(buildAutoCancelledHoldsMessage(3)).toBe('3 holds were auto-canceled because they expired.');
  });

  it('detects expired holds removed from the active incident while some holds remain active', () => {
    const notice = detectAutoCancelledExpiredHolds({
      previousIncidentId: 100,
      previousDeflectionIds: [1, 2],
      currentDeflections: [deflection({ id: 1, incidentId: 100, status: 'ACTIVE' })],
      historyDeflections: [deflection({ id: 2, incidentId: 100, status: 'EXPIRED' })],
    });

    expect(notice).toEqual({
      incidentId: 100,
      count: 1,
      allExpired: false,
    });
  });

  it('detects when all holds in the active incident were auto-canceled after expiry', () => {
    const notice = detectAutoCancelledExpiredHolds({
      previousIncidentId: 100,
      previousDeflectionIds: [1, 2],
      currentDeflections: [],
      historyDeflections: [
        deflection({ id: 1, incidentId: 100, status: 'EXPIRED' }),
        deflection({ id: 2, incidentId: 100, status: 'EXPIRED' }),
      ],
    });

    expect(notice).toEqual({
      incidentId: 100,
      count: 2,
      allExpired: true,
    });
  });

  it('splits out current incident deflections when there are no active holds', () => {
    const all = [
      deflection({ id: 1, incidentId: 100 }),
      deflection({ id: 2, incidentId: 100 }),
      deflection({ id: 3, incidentId: 200 }),
    ];

    const split = splitCurrentIncidentDeflections(all, { id: 100 }, false);
    expect(split.shouldShowCurrentIncidentGroup).toBe(true);
    expect(split.currentIncidentDeflections.map((d) => d.id)).toEqual([1, 2]);
    expect(split.remainingDeflections.map((d) => d.id)).toEqual([3]);
  });

  it('does not split current incident when active holds remain', () => {
    const all = [deflection({ id: 1, incidentId: 100 }), deflection({ id: 2, incidentId: 200 })];
    const split = splitCurrentIncidentDeflections(all, { id: 100 }, true);

    expect(split.shouldShowCurrentIncidentGroup).toBe(false);
    expect(split.currentIncidentDeflections).toEqual([]);
    expect(split.remainingDeflections.map((d) => d.id)).toEqual([1, 2]);
  });

  it('groups all history deflections by incident and sorts by latest hold activity', () => {
    const records = [
      deflection({ id: 1, incidentId: 1, updatedAt: '2026-02-27T09:00:00.000Z' }),
      deflection({ id: 2, incidentId: 2, updatedAt: '2026-02-27T11:00:00.000Z' }),
      deflection({ id: 3, incidentId: 1, updatedAt: '2026-02-27T10:00:00.000Z' }),
    ];
    const groups = groupDeflectionsByIncident(records, { 1: { id: 1 }, 2: { id: 2 } });

    expect(groups.map((g) => Number(g.incidentId))).toEqual([2, 1]);
    expect(groups[1].deflections.map((d) => d.id)).toEqual([3, 1]);
  });

  it('uses lifecycle timestamps when calculating hold activity recency', () => {
    const result = getDeflectionActivityMs(deflection({
      updatedAt: '2026-02-27T09:00:00.000Z',
      transferredAt: '2026-02-27T12:00:00.000Z',
      releasedAt: '2026-02-27T10:00:00.000Z',
    }));
    expect(result).toBe(new Date('2026-02-27T12:00:00.000Z').getTime());
  });

  describe('detectAdminCancelledHolds', () => {
    it('returns null when no holds were removed', () => {
      const notice = detectAdminCancelledHolds({
        previousIncidentId: 100,
        previousDeflectionIds: [1],
        currentDeflections: [deflection({ id: 1, incidentId: 100, status: 'ACTIVE' })],
        historyDeflections: [],
        currentUserId: 'user-1',
      });
      expect(notice).toBeNull();
    });

    it('returns null when holds were self-cancelled', () => {
      const notice = detectAdminCancelledHolds({
        previousIncidentId: 100,
        previousDeflectionIds: [1, 2],
        currentDeflections: [deflection({ id: 1, incidentId: 100, status: 'ACTIVE' })],
        historyDeflections: [deflection({ id: 2, incidentId: 100, status: 'CANCELLED', cancelledById: 'user-1' })],
        currentUserId: 'user-1',
      });
      expect(notice).toBeNull();
    });

    it('returns null for expired holds', () => {
      const notice = detectAdminCancelledHolds({
        previousIncidentId: 100,
        previousDeflectionIds: [1, 2],
        currentDeflections: [deflection({ id: 1, incidentId: 100, status: 'ACTIVE' })],
        historyDeflections: [deflection({ id: 2, incidentId: 100, status: 'EXPIRED' })],
        currentUserId: 'user-1',
      });
      expect(notice).toBeNull();
    });

    it('detects a single admin-cancelled hold', () => {
      const notice = detectAdminCancelledHolds({
        previousIncidentId: 100,
        previousDeflectionIds: [1, 2],
        currentDeflections: [deflection({ id: 1, incidentId: 100, status: 'ACTIVE' })],
        historyDeflections: [deflection({
          id: 2,
          incidentId: 100,
          status: 'CANCELLED',
          cancelledById: 'admin-1',
          subject: { firstName: 'Jane', lastName: 'Doe' },
        })],
        currentUserId: 'user-1',
      });

      expect(notice).toEqual({
        incidentId: 100,
        count: 1,
        allCancelled: false,
        personName: 'Jane Doe',
      });
    });

    it('detects all holds admin-cancelled', () => {
      const notice = detectAdminCancelledHolds({
        previousIncidentId: 100,
        previousDeflectionIds: [1, 2],
        currentDeflections: [],
        historyDeflections: [
          deflection({ id: 1, incidentId: 100, status: 'CANCELLED', cancelledById: 'admin-1', subject: { firstName: 'Jane', lastName: 'Doe' } }),
          deflection({ id: 2, incidentId: 100, status: 'CANCELLED', cancelledById: 'admin-1', subject: { firstName: 'John', lastName: 'Smith' } }),
        ],
        currentUserId: 'user-1',
      });

      expect(notice).toEqual({
        incidentId: 100,
        count: 2,
        allCancelled: true,
        personName: 'Jane Doe',
      });
    });

    it('returns null when no currentUserId provided', () => {
      const notice = detectAdminCancelledHolds({
        previousIncidentId: 100,
        previousDeflectionIds: [1],
        currentDeflections: [],
        historyDeflections: [deflection({ id: 1, incidentId: 100, status: 'CANCELLED', cancelledById: 'admin-1' })],
        currentUserId: undefined,
      });
      expect(notice).toBeNull();
    });
  });

  describe('buildAdminCancelledHoldsMessage', () => {
    it('builds single hold message with person name', () => {
      expect(buildAdminCancelledHoldsMessage({
        count: 1,
        allCancelled: false,
        personName: 'Jane Doe',
        facilityName: 'RESET',
      })).toBe('RESET cancelled hold for Jane Doe. Do not bring this person to RESET.');
    });

    it('builds all-cancelled message', () => {
      expect(buildAdminCancelledHoldsMessage({
        count: 2,
        allCancelled: true,
        personName: 'Jane Doe',
        facilityName: 'RESET',
      })).toBe('All active holds were cancelled by RESET. Incident was moved to History.');
    });

    it('builds single hold message without person name', () => {
      expect(buildAdminCancelledHoldsMessage({
        count: 1,
        allCancelled: false,
        personName: null,
        facilityName: 'RESET',
      })).toBe('RESET cancelled hold for this person. Do not bring this person to RESET.');
    });

    it('builds multi-hold message', () => {
      expect(buildAdminCancelledHoldsMessage({
        count: 3,
        allCancelled: false,
        personName: null,
        facilityName: 'RESET',
      })).toBe('RESET cancelled 3 holds. Do not bring these persons to RESET.');
    });
  });

  it('builds incident subtitle with address/time when present and fallback when missing', () => {
    const richSubtitle = buildIncidentSubtitle({
      addressLine1: '1843 9th Avenue',
      arrestedAt: '2026-02-27T09:54:00.000Z',
    });
    const fallbackSubtitle = buildIncidentSubtitle({});

    expect(richSubtitle).toContain('1843 9th Avenue');
    expect(richSubtitle).toContain('•');
    expect(fallbackSubtitle).toBe('Address unavailable • Time unavailable');
  });
});
