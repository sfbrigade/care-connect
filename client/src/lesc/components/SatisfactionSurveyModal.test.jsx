import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import Api from '@/Api';
import SatisfactionSurveyModal from './SatisfactionSurveyModal';

const { mockScheduleCooldown, mockShowToast } = vi.hoisted(() => ({
  mockScheduleCooldown: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('@/hooks/useSatisfactionSurveyEligibility', () => ({
  useSatisfactionSurveyEligibility: () => ({
    isEligible: true,
    scheduleCooldown: mockScheduleCooldown,
  }),
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

describe('SatisfactionSurveyModal cooldown on open', () => {
  beforeEach(() => {
    mockScheduleCooldown.mockReset();
    mockShowToast.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('calls scheduleCooldown when opened', async () => {
    renderSurveyModal();

    await waitFor(() => {
      expect(mockScheduleCooldown).toHaveBeenCalled();
    });
  });

  it('does not call scheduleCooldown while closed', () => {
    render(
      <MantineProvider>
        <SatisfactionSurveyModal
          opened={false}
          deflectionId={123}
          onFinished={vi.fn()}
          department='SFPD'
        />
      </MantineProvider>
    );

    expect(mockScheduleCooldown).not.toHaveBeenCalled();
  });

  it('invokes onFinished when closed without changing cooldown call count from reopen', async () => {
    const { onFinished } = renderSurveyModal();

    await waitFor(() => {
      expect(mockScheduleCooldown).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close survey' }));

    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(mockScheduleCooldown).toHaveBeenCalledTimes(1);
  });
});

describe('SatisfactionSurveyModal character limit validation', () => {
  const maxPlusOneText = 'a'.repeat(5001);

  beforeEach(() => {
    vi.mocked(Api.deflections.submitSatisfactionSurvey).mockReset();
    mockShowToast.mockReset();
    mockScheduleCooldown.mockReset();
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
