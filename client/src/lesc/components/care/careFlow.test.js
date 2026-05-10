import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getCareExitBackTo,
  getCareExitPrimaryActionState,
  getCareExitSuccessPayload,
  groupCareNotInCustodySections,
  hasPersistedExitDetails,
  getSavedExitDraft,
  hasSavedExitDraft,
  setSavedExitDraft,
  shouldShowCareCardViewDetails,
} from './careFlowUtils';
import {
  getCareDetailFooterState,
} from '../custody/careDetailFooterUtils';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Care flow unit tests', () => {
  it('shows Details for pre-release and post-release care records', () => {
    expect(
      shouldShowCareCardViewDetails({
        subjectStatus: 'IN_MEDICAL_INTAKE',
      })
    ).toBe(true);

    expect(
      shouldShowCareCardViewDetails({
        subjectStatus: 'IN_CHAIR',
      })
    ).toBe(true);

    expect(
      shouldShowCareCardViewDetails({
        subjectStatus: 'RELEASED',
        releasedAt: '2026-05-05T12:00:00.000Z',
      })
    ).toBe(true);

    expect(
      shouldShowCareCardViewDetails({
        subjectStatus: 'EXITED',
        exitDestination: 'JAIL',
      })
    ).toBe(true);

    expect(
      shouldShowCareCardViewDetails({
        subjectStatus: 'EXITED',
        exitDestination: 'HOSPITAL',
        releasedAt: '2026-05-05T12:00:00.000Z',
        exitedAt: '2026-05-05T18:00:00.000Z',
      })
    ).toBe(true);
  });

  it('detects persisted exit details only when all required fields exist', () => {
    expect(hasPersistedExitDetails({
      exitDestination: 'HOSPITAL',
      exitHousingStatus: 'TEMPORARY',
      exitConnectedToCare: 'YES',
      exitSFResident: 'YES',
    })).toBe(true);

    expect(hasPersistedExitDetails({
      exitDestination: 'HOSPITAL',
      exitHousingStatus: null,
      exitConnectedToCare: 'YES',
      exitSFResident: 'YES',
    })).toBe(false);
  });

  it('groups jail exits into Transferred to jail even when the person was legally released first', () => {
    const grouped = groupCareNotInCustodySections([
      { id: 1, subjectStatus: 'RELEASED' },
      { id: 2, subjectStatus: 'EXITED', exitDestination: 'HOSPITAL', releasedAt: '2026-01-01T00:00:00.000Z' },
      { id: 3, subjectStatus: 'EXITED', exitDestination: 'JAIL', releasedAt: '2026-01-01T00:00:00.000Z' },
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
      deflection: { id: 55, subjectStatus: 'IN_MEDICAL_INTAKE' },
    });
    expect(admittedState).toEqual({
      showFooter: true,
      primaryLabel: 'Update status',
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
      deflection: { id: 55, subjectStatus: 'IN_MEDICAL_INTAKE' },
    });
    expect(nonCareState.showFooter).toBe(false);
  });

  it('builds exit success payload used for highlight handoff and not-in-custody redirect', () => {
    const payload = getCareExitSuccessPayload(901);
    expect(payload).toEqual({
      highlightTarget: '901',
      navigateTo: '/care?tab=not-in-custody',
      toastTitle: 'Exit recorded',
      toastBody: 'Person now appears in "Exited facility" under "Legally released" (for 24 hours).',
    });
  });

  it('requires deputy property confirmation before enabling final exit confirmation', () => {
    expect(getCareExitPrimaryActionState({
      isExitFormComplete: true,
      hasAssociatedProperty: true,
      propertyReturnHandledConfirmed: null,
      isSaving: false,
    })).toEqual({
      label: 'Confirm exit',
      disabled: true,
    });

    expect(getCareExitPrimaryActionState({
      isExitFormComplete: true,
      hasAssociatedProperty: true,
      propertyReturnHandledConfirmed: false,
      isSaving: false,
    })).toEqual({
      label: 'Confirm exit',
      disabled: true,
    });

    expect(getCareExitPrimaryActionState({
      isExitFormComplete: true,
      hasAssociatedProperty: true,
      propertyReturnHandledConfirmed: true,
      isSaving: false,
    })).toEqual({
      label: 'Confirm exit',
      disabled: false,
    });

    expect(getCareExitPrimaryActionState({
      isExitFormComplete: true,
      hasAssociatedProperty: false,
      propertyReturnHandledConfirmed: null,
      isSaving: false,
    })).toEqual({
      label: 'Confirm exit',
      disabled: false,
    });
  });

  it('tracks edited exit forms in local storage', () => {
    const storage = {};
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key) => storage[key] ?? null,
        setItem: (key, value) => {
          storage[key] = String(value);
        },
      },
    });

    expect(hasSavedExitDraft(44)).toBe(false);

    setSavedExitDraft(44, {
      exitDestination: 'HOME',
      exitSFResident: 'YES',
      exitHousingStatus: 'TEMPORARY',
      exitConnectedToCare: 'NO',
      propertyReturnHandledConfirmed: false,
    });
    expect(hasSavedExitDraft(44)).toBe(true);
    expect(getSavedExitDraft(44)).toMatchObject({
      exitDestination: 'HOME',
      exitSFResident: 'YES',
      exitHousingStatus: 'TEMPORARY',
      exitConnectedToCare: 'NO',
      propertyReturnHandledConfirmed: false,
      exitFormEdited: true,
    });

    setSavedExitDraft(44, false);
    expect(hasSavedExitDraft(44)).toBe(false);
    expect(getSavedExitDraft(44)).toBe(null);
  });
});
