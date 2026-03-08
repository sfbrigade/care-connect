import React, { useContext } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const h = React.createElement;

const mocks = vi.hoisted(() => {
  let incident = null;
  return {
    get mockIncident () {
      return incident;
    },
    setMockIncident: (value) => {
      incident = value;
    },
    mockNavigate: vi.fn(),
    mockSetQueryData: vi.fn(),
    mockInvalidateQueries: vi.fn(),
    mockShowToast: vi.fn(),
    mockOpen: vi.fn(),
    mockApi: {
      incidents: {
        get: vi.fn(async () => ({ data: incident })),
      },
      deflections: {
        safetyCheck: vi.fn(async () => ({ data: {} })),
        release: vi.fn(async () => ({ data: {} })),
        update: vi.fn(async (id, payload) => ({ data: { id, ...payload } })),
      },
    },
  };
});

vi.mock('@/Api', () => ({ default: mocks.mockApi }));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.mockNavigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock('@/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mocks.mockShowToast,
  }),
}));

vi.mock('@/FacilityContext', () => ({
  useFacilityContext: () => ({
    facility: { id: 'facility-1' },
  }),
}));

vi.mock('@/utils/format', () => ({
  formatAddress: (obj = {}) => [obj.addressLine1, obj.city].filter(Boolean).join(', '),
  formatDateTime: () => 'formatted-date-time',
}));

vi.mock('@/utils/pdfGenerator', () => ({
  generateCertificateOfReleasePDF: () => ({
    output: () => 'blob:mock',
  }),
}));

vi.mock('@/components/Header', () => ({
  default: ({ children }) => h('div', null, children),
}));

vi.mock('@/components/IconButtonLink', () => ({
  default: () => h('a', null, 'back'),
}));

vi.mock('@/components/LockedQRCode', () => ({
  default: () => h('div', null, 'qr-code'),
}));

vi.mock('@tabler/icons-react', () => ({
  IconArrowLeft: () => null,
  IconExternalLink: () => null,
}));

vi.mock('@mantine/core', async () => {
  const ReactModule = await import('react');
  const { createElement, createContext } = ReactModule;
  const AccordionContext = createContext([]);
  const AccordionItemContext = createContext(null);

  const Accordion = ({ defaultValue = [], children }) => createElement(
    AccordionContext.Provider,
    { value: Array.isArray(defaultValue) ? defaultValue : [defaultValue] },
    createElement('div', null, children)
  );

  Accordion.Item = ({ value, children }) => createElement(
    AccordionItemContext.Provider,
    { value },
    createElement('section', { 'data-item': value }, children)
  );

  Accordion.Control = ({ children }) => createElement('div', null, children);

  Accordion.Panel = ({ children }) => {
    const openValues = useContext(AccordionContext);
    const itemValue = useContext(AccordionItemContext);
    if (!openValues.includes(itemValue)) return null;
    return createElement('div', null, children);
  };

  const passthrough = (tag) => ({ children, ...props }) => createElement(tag, props, children);

  return {
    Accordion,
    Box: passthrough('div'),
    Button: ({ children, ...props }) => createElement('button', props, children),
    Card: passthrough('div'),
    Container: passthrough('div'),
    Divider: () => createElement('hr'),
    Group: passthrough('div'),
    Image: (props) => createElement('img', props),
    Stack: passthrough('div'),
    Text: ({ children, ...props }) => createElement('p', props, children),
    Textarea: ({ value, ...props }) => createElement('textarea', { value, ...props }),
    Title: ({ children, ...props }) => createElement('h3', props, children),
  };
});

const mockMutation = (options = {}) => ({
  isPending: false,
  mutate: () => {},
  mutateAsync: async () => {
    const result = await options.mutationFn?.();
    options.onSuccess?.(result);
    return result;
  },
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: mocks.mockSetQueryData,
    invalidateQueries: mocks.mockInvalidateQueries,
  }),
  useQuery: (options) => {
    if (Array.isArray(options.queryKey) && options.queryKey[0] === 'incidents') {
      return { data: mocks.mockIncident };
    }
    return { data: null };
  },
  useMutation: (options) => mockMutation(options),
}));

let CustodyDetailContent;

describe('CustodyDetailContent', () => {
  beforeAll(async () => {
    CustodyDetailContent = (await import('./CustodyDetailContent')).default;
  });

  const deflection = {
    id: 123456,
    incidentId: 789,
    subjectStatus: 'READY_FOR_INTAKE',
    releaseNarrative: 'Initial narrative',
    behavior: 'Behavior details',
    deflectionDetails: [{ name: 'Observation A' }],
    property: 'BACKPACK',
    propertyDetails: 'One backpack',
    propertyPhotos: [],
    narcoticsSubstance: false,
    narcoticsParaphernalia: false,
    subject: {
      firstName: 'Test',
      lastName: 'Person',
    },
    createdAt: '2026-01-01T10:00:00.000Z',
    releasedAt: null,
    createdBy: null,
  };

  beforeEach(() => {
    global.window = { open: mocks.mockOpen, location: { origin: 'https://example.com' }, sessionStorage: { setItem: vi.fn() } };
    mocks.setMockIncident({
      id: 789,
      addressLine1: '123 Main St',
      city: 'SF',
      arrestedAt: '2026-01-01T09:00:00.000Z',
      cadNumber: 'CAD-123',
      supervisorBadgeNumber: 'SFSO-88',
    });
    vi.clearAllMocks();
  });

  it('renders updated custody labels and keeps arrest/property/incident sections collapsed by default', () => {
    const html = renderToStaticMarkup(h(CustodyDetailContent, { deflection, backTo: '/custody' }));

    expect(html).toContain('Safety check completed');
    expect(html).toContain('Intake staff can scan this code to start full intake.');
    expect(html).toContain('849(b).pdf');
    expect(html).toContain('Start legal release');
    expect(html).toContain('Arrest details');
    expect(html).toContain('Property details');
    expect(html).toContain('Incident details');

    expect(html).not.toContain('Selected observations');
    expect(html).not.toContain('Volume of property');
    expect(html).not.toContain('Date and time');
  });

  it('renders 849(b) narrative in read-only mode by default with edit button', () => {
    const html = renderToStaticMarkup(h(CustodyDetailContent, { deflection, backTo: '/custody' }));

    expect(html).toContain('849(b) release narrative');
    expect(html).toContain('This text will appear in the narrative block on the 849(b) form');
    expect(html).toContain('>Edit<');
    expect(html).not.toContain('<textarea');
  });
});
