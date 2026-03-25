import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import CareFacilityCard from './CareFacilityCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = { 'bedType.CHAIR': 'Chair', 'bedType.BED': 'Bed' };
      return translations[key] ?? key;
    },
  }),
}));

afterEach(cleanup);

function renderCard ({ facility = {}, bedTypes = [] } = {}) {
  return render(
    <MantineProvider>
      <CareFacilityCard facility={facility} bedTypes={bedTypes} />
    </MantineProvider>
  );
}

const openFacility = { status: 'OPEN_ACCEPTING' };

describe('CareFacilityCard', () => {
  it('renders availability for each bed type', () => {
    renderCard({
      facility: openFacility,
      bedTypes: [
        { id: '1', type: 'CHAIR', available: 9, holds: 4, occupied: 12 },
      ],
    });
    expect(screen.getByText(/^9 /)).toBeTruthy();
    expect(screen.getByText('4 in transit')).toBeTruthy();
    expect(screen.getByText('12 occupied')).toBeTruthy();
  });

  it('shows singular when available is 1', () => {
    renderCard({
      facility: openFacility,
      bedTypes: [
        { id: '1', type: 'CHAIR', available: 1, holds: 0, occupied: 0 },
      ],
    });
    expect(screen.getByText(/^1 /)).toBeTruthy();
  });

  it('shows red text when available is 0', () => {
    renderCard({
      facility: openFacility,
      bedTypes: [
        { id: '1', type: 'CHAIR', available: 0, holds: 4, occupied: 21 },
      ],
    });
    expect(screen.getByText(/^0 /)).toBeTruthy();
  });

  it('shows "Not accepting new holds" badge when OPEN_NOT_ACCEPTING', () => {
    renderCard({
      facility: { status: 'OPEN_NOT_ACCEPTING' },
      bedTypes: [
        { id: '1', type: 'CHAIR', available: 5, holds: 0, occupied: 12 },
      ],
    });
    expect(screen.getByText('Not accepting new holds')).toBeTruthy();
  });

  it('shows "Temporarily closed" badge when CLOSED', () => {
    renderCard({
      facility: { status: 'CLOSED' },
      bedTypes: [
        { id: '1', type: 'CHAIR', available: 0, holds: 0, occupied: 12 },
      ],
    });
    expect(screen.getByText('Temporarily closed')).toBeTruthy();
  });

  it('shows no badge when OPEN_ACCEPTING', () => {
    renderCard({
      facility: openFacility,
      bedTypes: [
        { id: '1', type: 'CHAIR', available: 5, holds: 0, occupied: 12 },
      ],
    });
    expect(screen.queryByText('Not accepting new holds')).toBeNull();
    expect(screen.queryByText('Temporarily closed')).toBeNull();
  });

  it('renders multiple bed types', () => {
    renderCard({
      facility: openFacility,
      bedTypes: [
        { id: '1', type: 'CHAIR', available: 5, holds: 2, occupied: 8 },
        { id: '2', type: 'BED', available: 3, holds: 1, occupied: 4 },
      ],
    });
    expect(screen.getByText(/^5 /)).toBeTruthy();
    expect(screen.getByText(/^3 /)).toBeTruthy();
    expect(screen.getByText('2 in transit')).toBeTruthy();
    expect(screen.getByText('1 in transit')).toBeTruthy();
  });

  it('handles empty bedTypes gracefully', () => {
    renderCard({ facility: openFacility, bedTypes: [] });
    expect(screen.queryByText(/available/)).toBeNull();
  });

  it('handles undefined bedTypes gracefully', () => {
    renderCard({ facility: openFacility });
    expect(screen.queryByText(/available/)).toBeNull();
  });
});
