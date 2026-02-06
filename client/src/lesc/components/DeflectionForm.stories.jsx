import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { facilityContext } from '@/FacilityContext';
import Api from '@/Api';
import DeflectionForm from './DeflectionForm';

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
  arrestedAt: new Date().toISOString(),
  cadNumber: '432',
  supervisorBadgeNumber: '4343',
};

const deflection = {
  id: '000003',
  subjectId: 'subject-1',
  subject: {
    id: 'subject-1',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1982-01-01T00:00:00.000Z',
    sex: 'MALE',
    race: 'WHITE',
  },
  deflectionDetails: [
    { id: 'coordination_problems' },
    { id: 'confused_speech' },
  ],
  behavior: 'Subject showed confusion and lacked coordination.',
  property: 'NONE',
  propertyDetails: '',
};

const deflectionDetailCategories = [
  {
    id: 'gross_motor',
    name: 'Gross motor impairment',
    deflectionDetails: [
      { id: 'coordination_problems', name: 'Coordination problems' },
      { id: 'slow_or_inconsistent_responses', name: 'Slow or inconsistent responses' },
    ],
  },
  {
    id: 'speech',
    name: 'Speech',
    deflectionDetails: [
      { id: 'confused_speech', name: 'Confused or rambling speech' },
      { id: 'slurred_speech', name: 'Slurred speech' },
    ],
  },
];

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

function setupApiMocks () {
  Api.facilities.activeIncident = () => Promise.resolve({ data: incident });
  Api.deflections.get = () => Promise.resolve({ data: deflection });
  Api.deflections.update = (id, payload) => Promise.resolve({
    data: {
      ...deflection,
      ...payload,
    },
  });
  Api.deflections.detailCategories = {
    index: () => Promise.resolve({ data: deflectionDetailCategories }),
  };
}

function StoryShell ({ entry }) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(['facilities', facility.id, 'active-incident'], incident);
  queryClient.setQueryData(['deflections', deflection.id], deflection);
  queryClient.setQueryData(['deflections', 'detail-categories'], deflectionDetailCategories);
  setupApiMocks();

  return (
    <facilityContext.Provider value={{ facility, setFacility: () => { } }}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path='/holds/:id/deflection' element={<DeflectionForm />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </facilityContext.Provider>
  );
}

export default {
  title: 'LESC/DeflectionForm',
  component: DeflectionForm,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export const NewFlow = {
  render: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`deflection-new-flow-${deflection.id}`);
    }
    return <StoryShell entry={`/holds/${deflection.id}/deflection?isNew=true`} />;
  },
};

export const PersistedStepLabel = {
  render: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`deflection-new-flow-${deflection.id}`, 'true');
    }
    return <StoryShell entry={`/holds/${deflection.id}/deflection`} />;
  },
};
