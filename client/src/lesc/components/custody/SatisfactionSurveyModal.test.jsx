import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import Api from '@/Api';
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

  it('returns false when no next eligible timestamp is stored and seeds localStorage', () => {
    expect(isSatisfactionSurveyEnabled()).toBe(false);

    const stored = window.localStorage.getItem(SATISFACTION_SURVEY_NEXT_ELIGIBLE_AT_KEY);
    expect(stored).toBeTruthy();
    const storedTimestamp = Number(stored);
    const expected = new Date(Date.now());
    expected.setMonth(expected.getMonth() + 1);
    expect(storedTimestamp).toBe(expected.getTime());
  });

  it('returns false before the next eligible timestamp', () => {
    const futureTimestamp = Date.now() + 60_000;
    window.localStorage.setItem(SATISFACTION_SURVEY_NEXT_ELIGIBLE_AT_KEY, String(futureTimestamp));

    expect(isSatisfactionSurveyEnabled()).toBe(false);
  });

  it('returns true when the next eligible timestamp is in the past', () => {
    const pastTimestamp = Date.now() - 60_000;
    window.localStorage.setItem(SATISFACTION_SURVEY_NEXT_ELIGIBLE_AT_KEY, String(pastTimestamp));

    expect(isSatisfactionSurveyEnabled()).toBe(true);
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

describe('SatisfactionSurveyModal character limit validation', () => {
  const maxPlusOneText = 'a'.repeat(5001);

  beforeEach(() => {
    vi.mocked(Api.deflections.submitSatisfactionSurvey).mockReset();
    mockShowToast.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows over-limit error styles and message for improvement suggestions', () => {
    renderSurveyModal();

    fireEvent.click(screen.getByRole('button', { name: 'Bad' }));
    const textarea = screen.getByPlaceholderText('Share your thoughts...');
    fireEvent.change(textarea, { target: { value: maxPlusOneText } });

    expect(screen.getByText('Max character limit reached. Please shorten your response.')).toBeInTheDocument();
    expect(textarea).toHaveStyle('color: var(--mantine-color-red-6)');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('prevents submission when any survey textarea exceeds 5000 characters', async () => {
    renderSurveyModal();

    fireEvent.click(screen.getByRole('button', { name: 'Bad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    const textarea = screen.getByPlaceholderText('Share your thoughts...');
    fireEvent.change(textarea, { target: { value: maxPlusOneText } });
    fireEvent.click(screen.getByRole('button', { name: 'Share feedback' }));

    await waitFor(() => {
      expect(Api.deflections.submitSatisfactionSurvey).not.toHaveBeenCalled();
    });
  });
});
