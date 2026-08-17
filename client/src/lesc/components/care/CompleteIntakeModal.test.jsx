import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import CompleteIntakeModal from './CompleteIntakeModal';

function renderModal (props = {}) {
  const handlers = {
    onClose: vi.fn(),
    onConfirmCompleted: vi.fn(),
    onConfirmNotCompleted: vi.fn(),
  };
  const utils = render(
    <MantineProvider>
      <CompleteIntakeModal opened {...handlers} {...props} />
    </MantineProvider>
  );
  return { ...utils, ...handlers };
}

describe('CompleteIntakeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens on the "Confirm medical intake" step', () => {
    renderModal();
    expect(screen.getByText('Confirm medical intake')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, intake completed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, return to Deputy' })).toBeInTheDocument();
    // Step 2's confirmation is not shown yet.
    expect(screen.queryByText('Confirm return to Deputy')).not.toBeInTheDocument();
  });

  it('"Yes, intake completed" completes intake without a second step', () => {
    const { onConfirmCompleted, onConfirmNotCompleted } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, intake completed' }));
    expect(onConfirmCompleted).toHaveBeenCalledTimes(1);
    expect(onConfirmNotCompleted).not.toHaveBeenCalled();
  });

  it('"No, return to Deputy" advances to the second confirmation without acting yet', () => {
    const { onConfirmNotCompleted, onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'No, return to Deputy' }));

    // The destructive action has NOT fired — we only advanced steps.
    expect(onConfirmNotCompleted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Confirm return to Deputy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm return to Deputy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('the second-step "Confirm return to Deputy" fires the destructive action', () => {
    const { onConfirmNotCompleted } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'No, return to Deputy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm return to Deputy' }));
    expect(onConfirmNotCompleted).toHaveBeenCalledTimes(1);
  });

  it('the second-step "Cancel" closes without acting', () => {
    const { onClose, onConfirmNotCompleted } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'No, return to Deputy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirmNotCompleted).not.toHaveBeenCalled();
  });

  it('the close (X) button closes the modal', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('resets to the first step when reopened', () => {
    const handlers = {
      onClose: vi.fn(),
      onConfirmCompleted: vi.fn(),
      onConfirmNotCompleted: vi.fn(),
    };
    const { rerender } = render(
      <MantineProvider>
        <CompleteIntakeModal opened {...handlers} />
      </MantineProvider>
    );

    // Advance to step 2, then close.
    fireEvent.click(screen.getByRole('button', { name: 'No, return to Deputy' }));
    expect(screen.getByRole('heading', { name: 'Confirm return to Deputy' })).toBeInTheDocument();
    rerender(
      <MantineProvider>
        <CompleteIntakeModal opened={false} {...handlers} />
      </MantineProvider>
    );

    // Reopen — we should be back on step 1, not the return-to-Deputy confirmation.
    rerender(
      <MantineProvider>
        <CompleteIntakeModal opened {...handlers} />
      </MantineProvider>
    );
    expect(screen.getByText('Confirm medical intake')).toBeInTheDocument();
    expect(screen.queryByText('Confirm return to Deputy')).not.toBeInTheDocument();
  });
});
