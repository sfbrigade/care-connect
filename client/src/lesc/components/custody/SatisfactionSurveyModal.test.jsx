import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import SatisfactionSurveyModal, {
  isSatisfactionSurveyEnabled,
  SATISFACTION_SURVEY_NEXT_ELIGIBLE_AT_KEY,
} from './SatisfactionSurveyModal';

const { mockShowToast } = vi.hoisted(() => ({
  mockShowToast: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      submitSatisfactionSurvey: vi.fn(),
    },
  },
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

function renderSurveyModal (props = {}) {
  const onFinished = vi.fn();
  render(
    <MantineProvider>
      <SatisfactionSurveyModal
        opened
        deflectionId={123}
        onFinished={onFinished}
        department='SFPD'
        {...props}
      />
    </MantineProvider>
  );
  return { onFinished };
}

describe('SatisfactionSurveyModal eligibility', () => {
  let dateNowSpy;

  beforeEach(() => {
    dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-15T12:00:00.000Z').getTime());
    window.localStorage.clear();
    mockShowToast.mockReset();
  });

  afterEach(() => {
    cleanup();
    dateNowSpy.mockRestore();
    window.localStorage.clear();
  });

  it('returns true when no next eligible timestamp is stored', () => {
    expect(isSatisfactionSurveyEnabled()).toBe(true);
  });

  it('returns false before the next eligible timestamp', () => {
    const futureTimestamp = Date.now() + 60_000;
    window.localStorage.setItem(SATISFACTION_SURVEY_NEXT_ELIGIBLE_AT_KEY, String(futureTimestamp));

    expect(isSatisfactionSurveyEnabled()).toBe(false);
  });

  it('writes the next eligible timestamp about one month ahead when opened', async () => {
    renderSurveyModal();

    await waitFor(() => {
      const storedValue = window.localStorage.getItem(SATISFACTION_SURVEY_NEXT_ELIGIBLE_AT_KEY);
      expect(storedValue).toBeTruthy();
    });

    const storedTimestamp = Number(window.localStorage.getItem(SATISFACTION_SURVEY_NEXT_ELIGIBLE_AT_KEY));
    const expected = new Date(Date.now());
    expected.setMonth(expected.getMonth() + 1);
    expect(storedTimestamp).toBe(expected.getTime());
  });

  it('keeps the updated timestamp when closed without submission', async () => {
    const { onFinished } = renderSurveyModal();

    await waitFor(() => {
      expect(window.localStorage.getItem(SATISFACTION_SURVEY_NEXT_ELIGIBLE_AT_KEY)).toBeTruthy();
    });

    const storedTimestampBeforeClose = window.localStorage.getItem(SATISFACTION_SURVEY_NEXT_ELIGIBLE_AT_KEY);
    fireEvent.click(screen.getByRole('button', { name: 'Close survey' }));

    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(SATISFACTION_SURVEY_NEXT_ELIGIBLE_AT_KEY)).toBe(storedTimestampBeforeClose);
  });
});
