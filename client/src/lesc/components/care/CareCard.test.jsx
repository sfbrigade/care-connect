import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter } from 'react-router';

import CareCard from './CareCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

function buildDeflection (overrides = {}) {
  return {
    id: 123,
    subjectStatus: 'ADMITTED',
    subject: {
      firstName: 'John',
      middleInitial: 'D',
      lastName: 'Doe',
      dateOfBirth: '1990-06-15',
      sex: 'MALE',
    },
    ...overrides,
  };
}

function renderCard ({
  deflection,
  hasExitDraft = false,
  onCompleteIntake = vi.fn(),
  onExitDetails = vi.fn(),
} = {}) {
  return {
    ...render(
      <BrowserRouter>
        <MantineProvider>
          <CareCard
            deflection={deflection}
            highlighted={false}
            hasExitDraft={hasExitDraft}
            onCompleteIntake={onCompleteIntake}
            onExitDetails={onExitDetails}
          />
        </MantineProvider>
      </BrowserRouter>
    ),
    onCompleteIntake,
    onExitDetails,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('CareCard', () => {
  it('shows View details and Update intake status for ADMITTED', () => {
    renderCard({ deflection: buildDeflection({ subjectStatus: 'ADMITTED' }) });

    expect(screen.getByRole('button', { name: 'View details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update intake status' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start exit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finish exit' })).not.toBeInTheDocument();
  });

  it('shows only View details for IN_CHAIR', () => {
    renderCard({ deflection: buildDeflection({ subjectStatus: 'IN_CHAIR' }) });

    expect(screen.getByRole('button', { name: 'View details' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update intake status' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start exit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finish exit' })).not.toBeInTheDocument();
  });

  it('shows View details and Start exit for RELEASED without saved exit details', () => {
    renderCard({
      deflection: buildDeflection({ subjectStatus: 'RELEASED' }),
      hasExitDraft: false,
    });

    expect(screen.getByRole('button', { name: 'View details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start exit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finish exit' })).not.toBeInTheDocument();
  });

  it('shows View details and Finish exit for RELEASED with saved exit details', () => {
    renderCard({
      deflection: buildDeflection({ subjectStatus: 'RELEASED' }),
      hasExitDraft: true,
    });

    expect(screen.getByRole('button', { name: 'View details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish exit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start exit' })).not.toBeInTheDocument();
  });

  it('shows no buttons for EXITED', () => {
    renderCard({ deflection: buildDeflection({ subjectStatus: 'EXITED' }) });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onCompleteIntake when Update intake status is clicked', () => {
    const { onCompleteIntake } = renderCard({
      deflection: buildDeflection({ subjectStatus: 'ADMITTED' }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update intake status' }));
    expect(onCompleteIntake).toHaveBeenCalledTimes(1);
  });

  it('calls onExitDetails when Start exit is clicked', () => {
    const { onExitDetails } = renderCard({
      deflection: buildDeflection({ subjectStatus: 'RELEASED' }),
      hasExitDraft: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start exit' }));
    expect(onExitDetails).toHaveBeenCalledTimes(1);
  });

  it('calls onExitDetails when Finish exit is clicked', () => {
    const { onExitDetails } = renderCard({
      deflection: buildDeflection({ subjectStatus: 'RELEASED' }),
      hasExitDraft: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finish exit' }));
    expect(onExitDetails).toHaveBeenCalledTimes(1);
  });
});
