import { describe, expect, it } from 'vitest';

import {
  getCareExitBackTo,
  getCareExitSuccessPayload,
  groupCareNotInCustodySections,
  shouldShowCareCardViewDetails,
} from './careFlowUtils';
import {
  getCareDetailFooterState,
} from '../custody/careDetailFooterUtils';

describe('Care flow unit tests', () => {
  it('hides View details for EXITED records transferred to jail', () => {
    expect(
      shouldShowCareCardViewDetails({
        subjectStatus: 'EXITED',
        exitDestinationId: 'jail',
      })
    ).toBe(false);

    expect(
      shouldShowCareCardViewDetails({
        subjectStatus: 'EXITED',
        exitDestinationId: 'hospital',
      })
    ).toBe(true);
  });

  it('groups not-in-custody records into Still onsite / Exited facility / Transferred to jail', () => {
    const grouped = groupCareNotInCustodySections([
      { id: 1, subjectStatus: 'RELEASED' },
      { id: 2, subjectStatus: 'EXITED', exitDestinationId: 'hospital' },
      { id: 3, subjectStatus: 'EXITED', exitDestinationId: 'jail' },
    ]);

    expect(grouped.STILL_ONSITE.map(d => d.id)).toEqual([1]);
    expect(grouped.EXITED_FACILITY.map(d => d.id)).toEqual([2]);
    expect(grouped.TRANSFERRED_TO_JAIL.map(d => d.id)).toEqual([3]);
  });

  it('resolves cancel/back navigation in exit form based on entry source', () => {
    expect(getCareExitBackTo({ fromDetail: true, id: '123', savedTab: 'in-custody' })).toBe('/care/123');
    expect(getCareExitBackTo({ fromDetail: false, id: '123', savedTab: 'not-in-custody' })).toBe('/care?tab=not-in-custody');
    expect(getCareExitBackTo({ fromDetail: false, id: '123', savedTab: 'in-custody' })).toBe('/care');
  });

  it('builds care detail footer state for Start exit + overflow disabled rules', () => {
    const careState = getCareDetailFooterState({
      viewerMode: 'care',
      deflection: { id: 55, subjectStatus: 'IN_CHAIR' },
    });
    expect(careState).toEqual({
      showFooter: true,
      overflowDisabled: true,
      startExitPath: '/care/55/exit?from=detail',
    });

    const nonCareState = getCareDetailFooterState({
      viewerMode: 'custody',
      deflection: { id: 55, subjectStatus: 'IN_CHAIR' },
    });
    expect(nonCareState.showFooter).toBe(false);
  });

  it('builds exit success payload used for highlight handoff and not-in-custody redirect', () => {
    const payload = getCareExitSuccessPayload(901);
    expect(payload).toEqual({
      highlightTarget: '901',
      navigateTo: '/care?tab=not-in-custody',
      toastTitle: 'Exit recorded',
      toastBody: 'Person now appears in Exited facility under Not in custody (last 24 hours).',
    });
  });
});
