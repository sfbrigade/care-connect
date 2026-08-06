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
  mockSearchParams,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowToast: vi.fn(),
  mockDeflectionGet: vi.fn(),
  mockDeflectionRelease: vi.fn(),
  mockDeflectionUpdate: vi.fn(),
  mockIncidentGet: vi.fn(),
  mockSearchParams: { value: new URLSearchParams() },
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
  useSearchParams: () => [mockSearchParams.value],
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

vi.mock('../../../hooks/useSatisfactionSurvey', () => ({
  default: () => ({
    navigateWithOptionalSurvey: mockNavigate,
  }),
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
        subjectStatus: 'READY_FOR_INTAKE',
      },
    });
    mockIncidentGet.mockResolvedValue({
      data: {
        id: 'incident-1',
      },
    });
    mockDeflectionRelease.mockResolvedValue({ data: {} });
    mockDeflectionUpdate.mockResolvedValue({ data: {} });
    mockSearchParams.value = new URLSearchParams();
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
    expect(screen.getByText('When you confirm release, the 849(b) will be sent to SFSO records and your e-mail.')).toBeInTheDocument();
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
    expect(screen.getByRole('radio', { name: 'BH Emergency/5150' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Elopement' })).toBeInTheDocument();
  });

  it('requires and submits an exit destination for BH Emergency/5150', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as reviewed' }));
    fireEvent.click(screen.getByRole('radio', { name: 'BH Emergency/5150' }));
    expect(screen.getByText('Confirm legal release and exit')).toBeInTheDocument();
    expect(screen.getByText('This will also mark the person as exited from RESET.')).toBeInTheDocument();
    expect(screen.getByText('Exit destination')).toBeInTheDocument();
    expect(screen.getByText('When you confirm release and exit, the 849(b) will be sent to SFSO records and your e-mail.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm release and exit' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Other' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm release and exit' }));

    await waitFor(() => {
      expect(mockDeflectionRelease).toHaveBeenCalledWith('123', {
        releaseReason: 'BH_EMERGENCY_5150',
        exitDestination: 'OTHER',
      });
    });
  });

  it('preselects other release and shows supplemental fields from search params', async () => {
    mockSearchParams.value = new URLSearchParams({
      from: 'detail',
      releaseReason: 'OTHER',
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as reviewed' }));

    expect(screen.getByText('Confirm legal release and exit')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Other (please specify)' })).toBeChecked();
    expect(screen.getByText('Other release reason')).toBeInTheDocument();
    expect(screen.getByText('Other release destination')).toBeInTheDocument();
    expect(screen.getByText('When you confirm release and exit, the 849(b) will be sent to SFSO records and your e-mail.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm release and exit' })).toBeDisabled();
  });

  it('hides can care for themselves when the person is not in chair', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as reviewed' }));

    expect(screen.queryByRole('radio', { name: 'Can care for themselves' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Medical issue (physical)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Other (please specify)' })).toBeInTheDocument();
  });

  it('uses release-and-exit copy for failed intake', async () => {
    mockDeflectionGet.mockResolvedValue({
      data: {
        id: '123',
        incidentId: 'incident-1',
        subjectStatus: 'FAILED_INTAKE',
      },
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as reviewed' }));

    expect(screen.getByText('Confirm legal release and exit')).toBeInTheDocument();
    expect(screen.getByText('When you confirm release and exit, the 849(b) will be sent to SFSO records and your e-mail.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm release and exit' })).toBeDisabled();
  });

  it('shows fixed can-care-for-themselves reason when the person is in chair', async () => {
    mockDeflectionGet.mockResolvedValue({
      data: {
        id: '123',
        incidentId: 'incident-1',
        subjectStatus: 'IN_CHAIR',
      },
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as reviewed' }));

    expect(screen.getByText('Confirm legal release')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Release reason: can care for themselves' })).toBeInTheDocument();
    expect(screen.getByText('If this person cannot care for themselves and instead needs to be exited to jail, to hospital, or for another reason, go back and choose a different option via the overflow menu.')).toBeInTheDocument();
    expect(screen.getByText('When you confirm release, the 849(b) will be sent to SFSO records and your e-mail.')).toBeInTheDocument();
    expect(screen.queryByText('Release reason')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Can care for themselves' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Medical issue (physical)' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm release' })).not.toBeDisabled();
    });
  });
});
