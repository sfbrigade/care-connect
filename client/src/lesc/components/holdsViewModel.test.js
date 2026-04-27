import { describe, it, expect } from 'vitest';

import {
  buildAdminCancelledHoldsMessage,
  buildAutoCancelledHoldsMessage,
  detectAutoCancelledExpiredHolds,
  getDeflectionActivityMs,
  groupDeflectionsByIncident,
  isInitialLoading,
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
  it('detects initial loading without treating background refetch as initial', () => {
    expect(isInitialLoading(true, undefined)).toBe(true);
    expect(isInitialLoading(true, [])).toBe(false);
    expect(isInitialLoading(false, undefined)).toBe(false);
  });

  it('builds singular and plural auto-cancel copy', () => {
    expect(buildAutoCancelledHoldsMessage(1)).toBe('1 hold was auto-canceled because it expired.');
    expect(buildAutoCancelledHoldsMessage(3)).toBe('3 holds were auto-canceled because they expired.');
  });

  it('detects expired holds removed while some holds remain active', () => {
    const notice = detectAutoCancelledExpiredHolds({
      previousDeflectionIds: [1, 2],
      currentDeflections: [deflection({ id: 1, incidentId: 100, status: 'ACTIVE' })],
      historyDeflections: [deflection({ id: 2, incidentId: 100, status: 'EXPIRED' })],
    });

    expect(notice).toEqual({ count: 1 });
  });

  it('detects expired holds across multiple incidents and when nothing remains active', () => {
    const notice = detectAutoCancelledExpiredHolds({
      previousDeflectionIds: [1, 2],
      currentDeflections: [],
      historyDeflections: [
        deflection({ id: 1, incidentId: 100, status: 'EXPIRED' }),
        deflection({ id: 2, incidentId: 200, status: 'EXPIRED' }),
      ],
    });

    expect(notice).toEqual({ count: 2 });
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

  it('ignores expiresAt (a future deadline) when calculating hold activity recency', () => {
    const result = getDeflectionActivityMs(deflection({
      updatedAt: '2026-02-27T09:00:00.000Z',
      cancelledAt: '2026-02-27T09:00:00.000Z',
      expiresAt: '2026-02-27T15:00:00.000Z',
    }));
    expect(result).toBe(new Date('2026-02-27T09:00:00.000Z').getTime());
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
});
