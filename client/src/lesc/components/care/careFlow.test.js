import { describe, expect, it } from 'vitest';

import {
  getCareExitBackTo,
  getCareExitPrimaryActionState,
  getCareExitSuccessPayload,
  groupCareNotInCustodySections,
  hasAnyPersistedExitDetails,
  hasPersistedExitDetails,
  shouldShowCareCardViewDetails,
} from './careFlowUtils';
import {
  getCareDetailFooterState,
} from '../custody/careDetailFooterUtils';

describe('Care flow unit tests', () => {
  it('hides Details for all EXITED records', () => {
    expect(
      shouldShowCareCardViewDetails({
        subjectStatus: 'EXITED',
        exitDestination: 'JAIL',
      })
    ).toBe(false);

    expect(
      shouldShowCareCardViewDetails({
        subjectStatus: 'EXITED',
        exitDestination: 'HOSPITAL',
      })
    ).toBe(false);
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

  it('detects any persisted exit details for in-progress server drafts', () => {
    expect(hasAnyPersistedExitDetails({
      exitDestination: 'HOSPITAL',
      exitHousingStatus: null,
      exitConnectedToCare: null,
      exitSFResident: null,
    })).toBe(true);

    expect(hasAnyPersistedExitDetails({
      exitDestination: null,
      exitHousingStatus: null,
      exitConnectedToCare: null,
      exitSFResident: null,
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

    const partialExitDetailsState = getCareDetailFooterState({
      viewerMode: 'care',
      deflection: { id: 100, subjectStatus: 'RELEASED', exitDestination: 'HOME' },
    });
    expect(partialExitDetailsState.primaryLabel).toBe('Finish exit');

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
});
