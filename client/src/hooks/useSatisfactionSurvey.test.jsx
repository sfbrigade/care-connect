import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import useSatisfactionSurvey, { SATISFACTION_SURVEY_NAVIGATION_STATE } from './useSatisfactionSurvey';

const { mockIsSatisfactionSurveyEnabled } = vi.hoisted(() => ({
  mockIsSatisfactionSurveyEnabled: vi.fn(),
}));

vi.mock('@/lesc/components/SatisfactionSurveyModal', () => ({
  __esModule: true,
  default: () => null,
  isSatisfactionSurveyEnabled: mockIsSatisfactionSurveyEnabled,
}));

describe('useSatisfactionSurvey', () => {
  const navigate = vi.fn();

  beforeEach(() => {
    navigate.mockReset();
    mockIsSatisfactionSurveyEnabled.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses eligibility gate for navigation intent', () => {
    mockIsSatisfactionSurveyEnabled.mockReturnValueOnce(false);
    const { result, rerender } = renderHook(() => useSatisfactionSurvey(navigate, '42', { department: 'SFPD' }));

    act(() => {
      result.current.navigateWithOptionalSurvey('/custody/42');
    });
    expect(navigate).toHaveBeenCalledWith('/custody/42');

    navigate.mockReset();
    mockIsSatisfactionSurveyEnabled.mockReturnValueOnce(true);
    rerender();

    act(() => {
      result.current.navigateWithOptionalSurvey('/custody/42');
    });
    expect(navigate).toHaveBeenCalledWith('/custody/42', {
      state: {
        [SATISFACTION_SURVEY_NAVIGATION_STATE]: {
          deflectionId: '42',
          department: 'SFPD',
        },
      },
    });
  });

  it('uses the same gate for delayed display scheduling', () => {
    vi.useFakeTimers();

    mockIsSatisfactionSurveyEnabled.mockReturnValue(false);
    const { result } = renderHook(() => useSatisfactionSurvey(navigate, '99', { department: 'SFSO' }));

    act(() => {
      result.current.scheduleOptionalSurveyWithoutNavigation('100');
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.satisfactionSurveyModal.props.opened).toBe(false);

    mockIsSatisfactionSurveyEnabled.mockReturnValue(true);
    const enabledHook = renderHook(() => useSatisfactionSurvey(navigate, '99', { department: 'SFSO' }));
    act(() => {
      enabledHook.result.current.scheduleOptionalSurveyWithoutNavigation('100');
    });
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(enabledHook.result.current.satisfactionSurveyModal.props.opened).toBe(true);
    expect(enabledHook.result.current.satisfactionSurveyModal.props.deflectionId).toBe('100');
  });
});
