import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key === 'sex.MALE' ? 'Male' : key === 'sex.FEMALE' ? 'Female' : key,
  }),
}));

vi.mock('../../Api', () => ({
  default: {
    deflections: {
      cancelReasons: {
        get: vi.fn(),
      },
    },
  },
}));

vi.mock('../../components/LockedQRCode', () => ({
  default: function LockedQRCodeMock () {
    return <div data-testid='locked-qr-code' />;
  },
}));

let Hold;

function buildDeflection (overrides = {}) {
  return {
    id: '012345',
    incidentId: '000123',
    subjectId: 'subject-123',
    subject: {
      id: 'subject-123',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      sex: 'MALE',
    },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 59 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    ...overrides,
  };
}

function renderHold (deflection) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <Hold
          incident={{ id: '000123' }}
          deflection={deflection}
          onCancelClick={vi.fn()}
          onDetailsClick={vi.fn()}
        />
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

beforeAll(async () => {
  Hold = (await import('./Hold')).default;
});

describe('Hold', () => {
  it('shows computed age and sex when DOB and sex are known', () => {
    renderHold(buildDeflection());

    expect(screen.getByText(/y\.o\., Male$/)).toBeInTheDocument();
  });

  it('shows only sex when DOB is missing', () => {
    renderHold(buildDeflection({
      subject: {
        id: 'subject-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: null,
        sex: 'MALE',
      },
    }));

    expect(screen.getByText('Male')).toBeInTheDocument();
    expect(screen.queryByText(/y\.o\./)).not.toBeInTheDocument();
  });

  it('shows only computed age when sex is missing', () => {
    renderHold(buildDeflection({
      subject: {
        id: 'subject-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        sex: null,
      },
    }));

    expect(screen.getByText(/y\.o\.$/)).toBeInTheDocument();
    expect(screen.queryByText('Male')).not.toBeInTheDocument();
  });

  it('shows the missing-data fallback when DOB and sex are both missing', () => {
    renderHold(buildDeflection({
      subject: {
        id: 'subject-123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: null,
        sex: null,
      },
    }));

    expect(screen.getByText('Age and gender missing')).toBeInTheDocument();
  });
});
