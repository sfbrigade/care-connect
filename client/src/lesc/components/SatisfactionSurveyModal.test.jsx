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
    users: {
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
        onFinished={onFinished}
        {...props}
      />
    </MantineProvider>
  );
  return { onFinished };
}

describe('SatisfactionSurveyModal cooldown scheduling', () => {
  beforeEach(() => {
    mockScheduleCooldown.mockReset();
    mockShowToast.mockReset();
    vi.mocked(Api.users.submitSatisfactionSurvey).mockReset();
    vi.mocked(Api.users.submitSatisfactionSurvey).mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  it('does not call scheduleCooldown when opened', () => {
    renderSurveyModal();

    expect(mockScheduleCooldown).not.toHaveBeenCalled();
  });

  it('does not call scheduleCooldown while closed', () => {
    render(
      <MantineProvider>
        <SatisfactionSurveyModal
          opened={false}
          onFinished={vi.fn()}
        />
      </MantineProvider>
    );

    expect(mockScheduleCooldown).not.toHaveBeenCalled();
  });

  it('calls scheduleCooldown when dismissed without submitting', () => {
    const { onFinished } = renderSurveyModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close survey' }));

    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(mockScheduleCooldown).toHaveBeenCalledTimes(1);
  });

  it('calls scheduleCooldown after feedback is saved successfully', async () => {
    const { onFinished } = renderSurveyModal();

    fireEvent.click(screen.getByRole('button', { name: 'Bad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share feedback' }));

    await waitFor(() => {
      expect(Api.users.submitSatisfactionSurvey).toHaveBeenCalledWith({
        answers: {
          careConnectRating: 'bad',
        },
      });
      expect(mockScheduleCooldown).toHaveBeenCalledTimes(1);
      expect(onFinished).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call scheduleCooldown when saving feedback fails', async () => {
    vi.mocked(Api.users.submitSatisfactionSurvey).mockRejectedValue(new Error('network error'));
    const { onFinished } = renderSurveyModal();

    fireEvent.click(screen.getByRole('button', { name: 'Bad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share feedback' }));

    await waitFor(() => {
      expect(Api.users.submitSatisfactionSurvey).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Feedback could not be saved. You can try again later.', 'error');
    });
    expect(mockScheduleCooldown).not.toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
  });
});

describe('SatisfactionSurveyModal character limit validation', () => {
  const maxPlusOneText = 'a'.repeat(5001);

  beforeEach(() => {
    vi.mocked(Api.users.submitSatisfactionSurvey).mockReset();
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
      expect(Api.users.submitSatisfactionSurvey).not.toHaveBeenCalled();
    });
  });
});
