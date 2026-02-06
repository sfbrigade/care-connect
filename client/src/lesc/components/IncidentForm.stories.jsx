import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { userEvent, within } from 'storybook/test';
import { facilityContext } from '@/FacilityContext';
import Api from '@/Api';
import IncidentForm from './IncidentForm';

const facility = {
  id: 'facility-1',
  name: 'San Francisco Facility',
  phone: '4155550100',
};

const incident = {
  id: '000003',
  addressLine1: '1 Main St',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94122',
  arrestedAt: new Date().toISOString(),
  cadNumber: '432',
  supervisorBadgeNumber: '4343',
};

function createQueryClient () {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  });
}

function setupApiMocks (incidentData) {
  Api.facilities.activeIncident = () => Promise.resolve({ data: incidentData });
  Api.incidents.update = (id, payload) => Promise.resolve({
    data: {
      ...incidentData,
      ...payload,
    },
  });
}

function StoryShell ({ incidentData }) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(['facilities', facility.id, 'active-incident'], incidentData);
  setupApiMocks(incidentData);

  return (
    <facilityContext.Provider value={{ facility, setFacility: () => {} }}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/holds']}>
          <IncidentForm />
        </MemoryRouter>
      </QueryClientProvider>
    </facilityContext.Provider>
  );
}

export default {
  title: 'LESC/IncidentForm',
  component: IncidentForm,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export const Default = {
  render: () => <StoryShell incidentData={incident} />,
};

export const BadgeTooShort = {
  render: () => <StoryShell incidentData={incident} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/Supervising Sergeant’s Star Number/i);
    await userEvent.clear(input);
    await userEvent.type(input, '12');
    await userEvent.tab();
  },
};
