/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import useSatisfactionSurvey, { SATISFACTION_SURVEY_NAVIGATION_STATE } from './useSatisfactionSurvey';

const { mockUseSatisfactionSurveyEligibility } = vi.hoisted(() => ({
  mockUseSatisfactionSurveyEligibility: vi.fn(),
}));

vi.mock('@/lesc/components/SatisfactionSurveyModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/hooks/useSatisfactionSurveyEligibility', () => ({
  useSatisfactionSurveyEligibility: () => mockUseSatisfactionSurveyEligibility(),
}));

describe('useSatisfactionSurvey', () => {
  const navigate = vi.fn();
  const scheduleCooldown = vi.fn();

  beforeEach(() => {
    navigate.mockReset();
    mockUseSatisfactionSurveyEligibility.mockReset();
    mockUseSatisfactionSurveyEligibility.mockReturnValue({ isEligible: false, scheduleCooldown });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses eligibility gate for navigation intent', () => {
    mockUseSatisfactionSurveyEligibility.mockReturnValueOnce({ isEligible: false, scheduleCooldown });
    const { result, rerender } = renderHook(() => useSatisfactionSurvey(navigate));

    act(() => {
      result.current.navigateWithOptionalSurvey('/custody/42');
    });
    expect(navigate).toHaveBeenCalledWith('/custody/42');

    navigate.mockReset();
    mockUseSatisfactionSurveyEligibility.mockReturnValueOnce({ isEligible: true, scheduleCooldown });
    rerender();

    act(() => {
      result.current.navigateWithOptionalSurvey('/custody/42');
    });
    expect(navigate).toHaveBeenCalledWith('/custody/42', {
      state: {
        [SATISFACTION_SURVEY_NAVIGATION_STATE]: true,
      },
    });
  });

  it('uses the same gate for delayed display scheduling', () => {
    vi.useFakeTimers();

    mockUseSatisfactionSurveyEligibility.mockReturnValue({ isEligible: false, scheduleCooldown });
    const { result } = renderHook(() => useSatisfactionSurvey(navigate));

    act(() => {
      result.current.scheduleOptionalSurveyWithoutNavigation();
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.satisfactionSurveyModal.props.opened).toBe(false);

    mockUseSatisfactionSurveyEligibility.mockReturnValue({ isEligible: true, scheduleCooldown });
    const enabledHook = renderHook(() => useSatisfactionSurvey(navigate));
    act(() => {
      enabledHook.result.current.scheduleOptionalSurveyWithoutNavigation();
    });
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(enabledHook.result.current.satisfactionSurveyModal.props.opened).toBe(true);
  });
});
