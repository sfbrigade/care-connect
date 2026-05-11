import React from 'react';
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
        email849b: vi.fn(async () => ({ data: { queued: true, email: 'sfsouser1@test.com' } })),
        exitToJail: vi.fn(async () => ({ data: {} })),
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
  formatIntakeStartedAt: (date) => (date ? 'Apr 29, 11:24 AM' : null),
  formatTimeRemaining: () => '59:57',
}));

vi.mock('@/utils/releaseTiming', () => ({
  releaseTiming: () => null,
}));

vi.mock('@/utils/openInBrowser', () => ({
  openInBrowser: vi.fn(),
}));

vi.mock('../../../hooks/useSessionState', () => ({
  default: () => (['', vi.fn()]),
}));

vi.mock('../../../hooks/useUserRole', () => ({
  useUserRole: () => ({
    isCustody: true,
  }),
}));

vi.mock('@/utils/pdfGenerator', () => ({
  generateCertificateOfReleasePDF: () => ({
    output: () => 'blob:mock',
  }),
}));

vi.mock('@/components/Header', () => ({
  default: ({ children }) => h('div', null, children),
}));

vi.mock('@/components/ActionFooter', () => ({
  default: ({ children }) => h('div', null, children),
}));

vi.mock('@/components/IconButtonLink', () => ({
  default: () => h('a', null, 'back'),
}));

vi.mock('@/components/LockedQRCode', () => ({
  default: () => h('div', null, 'qr-code'),
}));

vi.mock('@tabler/icons-react', () => ({
  IconAlertCircle: () => null,
  IconAlarm: () => null,
  IconArrowLeft: () => null,
  IconBuildingHospital: () => null,
  IconDoorExit: () => null,
  IconDots: () => null,
  IconExternalLink: () => null,
  IconFileAlert: () => null,
  IconFileCheck: () => null,
  IconX: () => null,
}));

vi.mock('@mantine/core', async () => {
  const ReactModule = await import('react');
  const { createElement, createContext } = ReactModule;
  const AccordionContext = createContext([]);
  const AccordionItemContext = createContext(null);

  const Accordion = ({ defaultValue = [], value, children }) => createElement(
    AccordionContext.Provider,
    { value: Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [defaultValue] },
    createElement('div', null, children)
  );

  Accordion.Item = ({ value, children }) => createElement(
    AccordionItemContext.Provider,
    { value },
    createElement('section', { 'data-item': value }, children)
  );

  Accordion.Control = ({ children }) => createElement('div', null, children);

  // just open and render all panels for now
  Accordion.Panel = ({ children }) => createElement('div', null, children);
  // Accordion.Panel = ({ children }) => {
  //   const openValues = useContext(AccordionContext);
  //   const itemValue = useContext(AccordionItemContext);
  //   if (!openValues.includes(itemValue)) return null;
  //   return createElement('div', null, children);
  // };

  const passthrough = (tag) => ({ children, classNames, styles, ...props }) => createElement(tag, props, children);

  const Menu = passthrough('div');
  Menu.Target = passthrough('div');
  Menu.Dropdown = passthrough('div');
  Menu.Item = passthrough('a');

  return {
    Accordion,
    ActionIcon: passthrough('div'),
    Badge: passthrough('div'),
    Box: passthrough('div'),
    Button: ({ children, ...props }) => createElement('button', props, children),
    Card: passthrough('div'),
    Container: passthrough('div'),
    Divider: () => createElement('hr'),
    Group: passthrough('div'),
    Image: (props) => createElement('img', props),
    Menu,
    Modal: passthrough('div'),
    Stack: passthrough('div'),
    Text: ({ children, ...props }) => createElement('p', props, children),
    Textarea: ({ value, ...props }) => createElement('textarea', { value, ...props }),
    Title: ({ children, ...props }) => createElement('h3', props, children),
  };
});

const mockMutation = (options = {}) => ({
  isPending: false,
  mutate: () => { },
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

let render;
let CustodyDetailContent;
let AuthContextProvider;

describe('CustodyDetailContent', () => {
  beforeAll(async () => {
    CustodyDetailContent = (await import('./CustodyDetailContent')).default;
    AuthContextProvider = (await import('../../../AuthContextProvider')).default;

    render = (deflectionOverride = {}, propsOverride = {}) => {
      const content = h(CustodyDetailContent, {
        deflection: {
          ...deflection,
          ...deflectionOverride,
        },
        backTo: propsOverride.viewerMode === 'care' ? '/care' : '/custody',
        ...propsOverride,
      });
      const provider = h(AuthContextProvider, null, content);
      return renderToStaticMarkup(provider);
    };
  });

  const deflection = {
    id: 123456,
    incidentId: 789,
    subjectStatus: 'READY_FOR_INTAKE',
    expiresAt: '2026-01-01T11:00:00.000Z',
    releaseNarrative: 'Initial narrative',
    behavior: 'Behavior details',
    property: 'BACKPACK',
    propertyDetails: 'One backpack',
    propertyPhotos: [],
    narcoticsSubstance: false,
    narcoticsParaphernalia: false,
    drugUseEvidence: false,
    drugType: null,
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
      caseNumber: 'CASE-456',
      supervisorBadgeNumber: 'SFSO-88',
    });
    vi.clearAllMocks();
  });

  it('renders updated custody labels', () => {
    const html = render();

    expect(html).toContain('Intake staff can scan this code to start full intake.');
    expect(html).toContain('Record exit to other');
    expect(html).toContain('Behavioral observations');
    expect(html).toContain('Substance-related details');
    expect(html).toContain('Personal property');
    expect(html).toContain('Linked to Hold 123456.');
    expect(html).toContain('Incident details');
    expect(html).toContain('CASE-456');

    expect(html.indexOf('Record exit to hospital')).toBeLessThan(html.indexOf('Record exit to other'));
  });

  it('renders 849(b) narrative in read-only mode by default with edit button', () => {
    const html = render();

    expect(html).toContain('849(b) release narrative');
    expect(html).toContain('Any narrative edits will automatically update the 849(b) document.');
    expect((html.match(/>Edit</g) || [])).toHaveLength(3);
    expect(html).not.toContain('<textarea');
  });

  it('renders pre-transfer custody details read-only without the 849(b) narrative', () => {
    const html = render({ subjectStatus: 'DETAINED' });

    expect(html).toContain('Expires in');
    expect(html).toContain('Awaiting arrival');
    expect(html).toContain('Substance-related details');
    expect(html).toContain('Behavioral observations');
    expect(html).toContain('Incident details');
    expect(html).not.toContain('849(b) release narrative');
    expect(html).not.toContain('>Edit<');
  });

  it('shows Arrived chip and suppresses the expiry timer for ONSITE_AWAITING_TRANSFER holds', () => {
    const html = render({ subjectStatus: 'ONSITE_AWAITING_TRANSFER' });

    expect(html).toContain('Arrived');
    expect(html).not.toContain('Awaiting arrival');
    expect(html).not.toContain('Expires in');
    expect(html).not.toContain('849(b) release narrative');
    expect(html).not.toContain('>Edit<');
  });

  it('shows post-release 849(b) PDF, e-mail, and narrative edit actions', () => {
    const html = render({
      subjectStatus: 'EXITED',
      releasedAt: '2026-01-01T11:00:00.000Z',
      exitedAt: '2026-01-01T12:00:00.000Z',
    });

    expect(html).toContain('849(b).pdf');
    expect(html).toContain('E-mail me the 849(b)');
    expect(html).toContain('Edit narrative');
  });

  it('allows property edits after legal release until exit', () => {
    const html = render({
      subjectStatus: 'RELEASED',
      releasedAt: '2026-01-01T11:00:00.000Z',
    });

    expect(html).toContain('Personal property');
    expect((html.match(/>Edit</g) || [])).toHaveLength(1);
    expect(html).toContain('Edit narrative');
  });

  it('does not allow property edits after exit', () => {
    const html = render({
      subjectStatus: 'EXITED',
      releasedAt: '2026-01-01T11:00:00.000Z',
      exitedAt: '2026-01-01T12:00:00.000Z',
    });

    expect(html).toContain('Personal property');
    expect(html).not.toContain('>Edit</button>');
    expect(html).toContain('Edit narrative');
  });

  it('builds the default 849(b) narrative from case number, cad number, and 647(f) narrative', () => {
    const html = render({ releaseNarrative: null });

    expect(html).toContain('Incident number: CASE-456');
    expect(html).toContain('Cad number: CAD-123');
    expect(html).toContain('The Officer who brought the person to RESET recorded the following observations on the 647(f) documentation:');
    expect(html).toContain('Behavior details');
  });

  it('does not show exit to hospital in overflow actions for released status', () => {
    const html = render({ subjectStatus: 'RELEASED' });

    expect(html).not.toContain('Exit to hospital');
    expect(html).not.toContain('Record exit to hospital');
  });

  it('only shows exit to jail in overflow actions for failed intake', () => {
    const html = render({ subjectStatus: 'FAILED_INTAKE' });

    expect(html).toContain('>Exit to jail</a>');
    expect(html).not.toContain('>Record exit to jail</a>');
    expect(html).not.toContain('>Record exit to hospital</a>');
    expect(html).not.toContain('>Record exit to other</a>');
    expect(html).not.toContain('>Record death</a>');
    expect(html).toContain('Release and exit');
    expect(html).not.toContain('Start legal release');
  });

  it('renders the updated safety check modal copy in the footer action flow', () => {
    const html = render({ subjectStatus: 'AWAITING_INTAKE' });

    expect(html).toContain('Safety check');
    expect(html).toContain('Record safety check');
    expect(html).toContain('Indicate a failed check if you have a safety concern that would require an exit to jail.');
    expect(html).toContain('Passed');
    expect(html).toContain('Failed');
  });
  it('shows drug use status and selected drug type in care personal details', () => {
    const html = render(
      {
        subjectStatus: 'IN_MEDICAL_INTAKE',
        medicalIntakeStartedAt: '2026-04-29T11:24:00.000',
        drugUseEvidence: true,
        drugType: 'ALCOHOL'
      },
      { viewerMode: 'care' }
    );

    expect(html).toContain('Intake started: Apr 29, 11:24 AM');
    expect(html).toContain('Edit');
    expect(html).toContain('Substance-related details');
    expect(html).toContain('Signs of substance use');
    expect(html).toContain('Yes');
    expect(html).toContain('Substance used (suspected)');
    expect(html).toContain('drugType.ALCOHOL');
  });

  it('does not show intake started timestamp in custody details', () => {
    const html = render({
      subjectStatus: 'ADMITTED',
      admittedAt: '2026-04-29T11:24:00.000',
    });

    expect(html).not.toContain('Intake started: Apr 29, 11:24 AM');
  });

  it('hides behavioral observations in care personal details', () => {
    const html = render(
      {
        subjectStatus: 'IN_MEDICAL_INTAKE',
        drugUseEvidence: true,
        drugType: 'ALCOHOL',
        behavior: 'Person was stumbling into traffic.',
      },
      { viewerMode: 'care' }
    );

    expect(html).toContain('Substance-related details');
    expect(html).not.toContain('Behavioral observations');
    expect(html).not.toContain('Arrestable behavior');
    expect(html).not.toContain('Person was stumbling into traffic.');
  });

  it('shows no drug use status without a drug type in care personal details', () => {
    const html = render(
      { subjectStatus: 'IN_MEDICAL_INTAKE', drugUseEvidence: false, drugType: null },
      { viewerMode: 'care' }
    );

    expect(html).toContain('Substance-related details');
    expect(html).toContain('Signs of substance use');
    expect(html).toContain('No');
    expect(html).not.toContain('Substance used (suspected)');
  });

  it('does not show care behavioral observations without substance-related details', () => {
    const html = render(
      {
        subjectStatus: 'IN_MEDICAL_INTAKE',
        drugUseEvidence: null,
        behavior: 'Person was stumbling into traffic.',
      },
      { viewerMode: 'care' }
    );

    expect(html).not.toContain('Behavioral observations');
    expect(html).not.toContain('Arrestable behavior');
    expect(html).not.toContain('Person was stumbling into traffic.');
  });
});
