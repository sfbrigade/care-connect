import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router';

import LegalReleaseQuestions from './LegalReleaseQuestions';

const {
  mockNavigate,
  mockGetDeflection,
  mockShowToast,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetDeflection: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '123' }),
    useSearchParams: () => [new URLSearchParams()],
  };
});

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      get: mockGetDeflection,
      update: vi.fn(),
      release: vi.fn(),
    },
    incidents: {
      get: vi.fn(),
    },
  },
}));

vi.mock('@/components/Header', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/IconButtonLink', () => ({
  default: () => <button type='button'>Back</button>,
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
}));

vi.mock('../../../hooks/useEnsureReleaseNarrative', () => ({
  default: () => 'Generated narrative text.',
}));

function renderPage () {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LegalReleaseQuestions />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDeflection.mockResolvedValue({
    data: {
      id: 123,
      incidentId: null,
    },
  });
});

afterEach(() => {
  cleanup();
});

describe('LegalReleaseQuestions', () => {
  it('shows the SFSO supervisor notice above the release actions', async () => {
    renderPage();

    expect(await screen.findByText('When you confirm release, the 849(b) will be sent to SFSO .')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm release' })).toBeDisabled();
  });
});
