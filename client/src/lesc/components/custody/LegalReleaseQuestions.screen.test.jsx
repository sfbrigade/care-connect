import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LegalReleaseQuestions from './LegalReleaseQuestions';

const {
  mockNavigate,
  mockShowToast,
  mockDeflectionGet,
  mockDeflectionRelease,
  mockDeflectionUpdate,
  mockIncidentGet,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
  mockDeflectionGet: vi.fn(),
  mockDeflectionRelease: vi.fn(),
  mockDeflectionUpdate: vi.fn(),
  mockIncidentGet: vi.fn(),
}));

vi.mock('@/Api', () => ({
  default: {
    deflections: {
      get: mockDeflectionGet,
      release: mockDeflectionRelease,
      update: mockDeflectionUpdate,
    },
    incidents: {
      get: mockIncidentGet,
    },
  },
}));

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '123' }),
  useSearchParams: () => [new URLSearchParams()],
}));

vi.mock('@unhead/react', () => ({
  Head: ({ children }) => <>{children}</>,
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

vi.mock('../../../hooks/useEnsureReleaseNarrative', () => ({
  default: () => 'Narrative text for the 849(b).',
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
        <LegalReleaseQuestions />
      </QueryClientProvider>
    </MantineProvider>
  );
}

describe('LegalReleaseQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDeflectionGet.mockResolvedValue({
      data: {
        id: '123',
        incidentId: 'incident-1',
      },
    });
    mockIncidentGet.mockResolvedValue({
      data: {
        id: 'incident-1',
      },
    });
    mockDeflectionRelease.mockResolvedValue({ data: {} });
    mockDeflectionUpdate.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    cleanup();
  });

  it('hides the release reason and final actions until the narrative is reviewed', async () => {
    renderPage();

    expect(await screen.findByText('Narrative text for the 849(b).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit narrative' })).toBeInTheDocument();
    expect(screen.queryByText('Release reason')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm release' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('shows the release reason section after review and restores the initial state on undo', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as reviewed' }));

    expect(screen.getByRole('button', { name: 'Reviewed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo review' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit narrative' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose a release reason.' })).toBeInTheDocument();
    expect(screen.getByText('Release reason')).toBeInTheDocument();
    expect(screen.getByText('When you confirm release, the 849(b) will be sent to SFSO supervisors.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm release' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Undo review' }));

    expect(screen.getByRole('button', { name: 'Mark as reviewed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit narrative' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo review' })).not.toBeInTheDocument();
    expect(screen.queryByText('Release reason')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm release' })).not.toBeInTheDocument();
  });

  it('renders the updated release reason labels', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as reviewed' }));

    expect(screen.getByRole('radio', { name: 'Medical issue (physical)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Behavioral health evaluation' })).toBeInTheDocument();
  });

  it('submits behavioral health evaluation as the selected release reason', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as reviewed' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Behavioral health evaluation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release' }));

    await waitFor(() => {
      expect(mockDeflectionRelease).toHaveBeenCalledWith('123', {
        releaseReasonId: 'behavioral_health_evaluation',
      });
    });
  });
});
