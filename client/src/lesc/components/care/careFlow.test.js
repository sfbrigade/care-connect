import { describe, expect, it } from 'vitest';

import {
  getCareExitBackTo,
  getCareExitPrimaryActionState,
  getCareExitSuccessPayload,
  groupCareNotInCustodySections,
  hasPersistedExitDetails,
  shouldShowCareCardViewDetails,
} from './careFlowUtils';
import {
  getCareDetailFooterState,
} from '../custody/careDetailFooterUtils';

describe('Care flow unit tests', () => {
  it('hides View details for all EXITED records', () => {
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
    ).toBe(false);
  });

  it('detects persisted exit details only when all required fields exist', () => {
    expect(hasPersistedExitDetails({
      exitDestinationId: 'hospital',
      exitHousingStatusId: 'temporary',
      exitConnectedToCare: 'YES',
      exitSFResident: 'YES',
    })).toBe(true);

    expect(hasPersistedExitDetails({
      exitDestinationId: 'hospital',
      exitHousingStatusId: null,
      exitConnectedToCare: 'YES',
      exitSFResident: 'YES',
    })).toBe(false);
  });

  it('groups not-in-custody records into Still onsite / Exited facility / Transferred to jail', () => {
    const grouped = groupCareNotInCustodySections([
      { id: 1, subjectStatus: 'RELEASED' },
      { id: 2, subjectStatus: 'EXITED', exitDestinationId: 'hospital' },
      { id: 3, subjectStatus: 'EXITED', exitDestinationId: 'jail', releasedAt: null },
    ]);

    expect(grouped.STILL_ONSITE.map(d => d.id)).toEqual([1]);
    expect(grouped.EXITED_FACILITY.map(d => d.id)).toEqual([2]);
    expect(grouped.TRANSFERRED_TO_JAIL.map(d => d.id)).toEqual([3]);
  });

  it('resolves cancel/back navigation in exit form based on entry source', () => {
    expect(getCareExitBackTo({ fromDetail: true, id: '123' })).toBe('/care/123');
    expect(getCareExitBackTo({ fromDetail: false })).toBe('/care');
  });

  it('builds care detail footer state by status/action mode', () => {
    const admittedState = getCareDetailFooterState({
      viewerMode: 'care',
      deflection: { id: 55, subjectStatus: 'ADMITTED' },
    });
    expect(admittedState).toEqual({
      showFooter: true,
      primaryLabel: 'Complete intake',
      primaryAction: 'complete-intake',
      startExitPath: '/care/55/exit?from=detail',
    });

    const releasedState = getCareDetailFooterState({
      viewerMode: 'care',
      deflection: { id: 99, subjectStatus: 'RELEASED' },
    });
    expect(releasedState.showFooter).toBe(true);
    expect(releasedState.primaryAction).toBe('start-exit');
    expect(releasedState.startExitPath).toBe('/care/99/exit?from=detail');

    const inChairState = getCareDetailFooterState({
      viewerMode: 'care',
      deflection: { id: 56, subjectStatus: 'IN_CHAIR' },
    });
    expect(inChairState.showFooter).toBe(false);

    const nonCareState = getCareDetailFooterState({
      viewerMode: 'custody',
      deflection: { id: 55, subjectStatus: 'ADMITTED' },
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

  it('requires deputy property confirmation before enabling final exit confirmation', () => {
    expect(getCareExitPrimaryActionState({
      isSectionTwoComplete: true,
      physicalLeftFinal: true,
      propertyReturnHandledConfirmed: false,
      isSaving: false,
    })).toEqual({
      label: 'Confirm exit',
      disabled: true,
    });

    expect(getCareExitPrimaryActionState({
      isSectionTwoComplete: true,
      physicalLeftFinal: true,
      propertyReturnHandledConfirmed: true,
      isSaving: false,
    })).toEqual({
      label: 'Confirm exit',
      disabled: false,
    });

    expect(getCareExitPrimaryActionState({
      isSectionTwoComplete: true,
      physicalLeftFinal: false,
      propertyReturnHandledConfirmed: false,
      isSaving: false,
    })).toEqual({
      label: 'Save exit details',
      disabled: false,
    });
  });
});
