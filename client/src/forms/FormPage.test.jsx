import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import FormPage from './FormPage';

const {
  mockDeflectionGet,
  mockFetch,
  mockNavigate,
} = vi.hoisted(() => ({
  mockDeflectionGet: vi.fn(),
  mockFetch: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      get: mockDeflectionGet,
    },
  },
}));

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({
    formId: '647f',
    deflectionId: '123',
  }),
}));

vi.mock('./formRegistry', () => ({
  default: {
    '647f': {
      title: 'SFPD 647(f) Report',
      canGenerate: deflection => deflection.transferredAt
        ? true
        : { message: 'This document is not available yet.' },
    },
  },
}));

function renderPage () {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <FormPage />
      </QueryClientProvider>
    </MantineProvider>
  );
}

describe('FormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = mockFetch;
    global.URL.createObjectURL = vi.fn(() => 'blob:pdf-preview');
    global.URL.revokeObjectURL = vi.fn();

    mockDeflectionGet.mockResolvedValue({
      data: {
        id: 123,
        transferredAt: '2026-06-10T19:00:00.000Z',
        subjectStatus: 'AWAITING_INTAKE',
        subject: {
          firstName: 'Taylor',
          lastName: 'SFPD1',
        },
      },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['pdf'], { type: 'application/pdf' })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads the PDF viewer directly without a generate button', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/forms/647f/pdf/123', expect.any(Object));
    });

    expect(screen.queryByRole('button', { name: /generate pdf/i })).not.toBeInTheDocument();
    expect(screen.getByTitle('SFPD 647(f) Report')).toHaveAttribute('src', 'blob:pdf-preview#navpanes=0&zoom=FitH');
  });
});
