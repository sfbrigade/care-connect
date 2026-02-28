import CustodyDetailContent from './CustodyDetailContent';

export default {
  title: 'LESC/Custody/CustodyDetail',
  component: CustodyDetailContent,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

const fullSubject = {
  id: 'bfe79463-866a-40b3-8b6a-068e716a02db',
  firstName: 'John',
  middleInitial: 'D',
  lastName: 'Doe',
  dateOfBirth: '1990-06-15T00:00:00.000Z',
  sex: 'MALE',
  race: 'WHITE',
  driverLicense: 'D1234567',
  addressLine1: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94103',
};

const fullDeflection = {
  id: 123,
  subjectStatus: 'AWAITING_INTAKE',
  narcoticsSubstance: true,
  narcoticsParaphernalia: false,
  behavior: 'Subject was found unresponsive on the sidewalk.',
  property: 'BACKPACK',
  propertyDetails: 'One backpack, one sleeping bag',
  propertyPhotos: [],
  deflectionDetails: [
    { id: '1', name: 'Unable to care for basic needs' },
    { id: '2', name: 'Signs of substance use' },
  ],
  subject: fullSubject,
};

export const AllDetails = {
  args: {
    deflection: fullDeflection,
  },
};

export const MinimalDetails = {
  args: {
    deflection: {
      id: 456,
      subjectStatus: 'ADMITTED',
      narcoticsSubstance: null,
      narcoticsParaphernalia: null,
      behavior: null,
      property: null,
      propertyDetails: null,
      propertyPhotos: [],
      deflectionDetails: [],
      subject: {
        id: 'abc12345-866a-40b3-8b6a-068e716a02db',
        firstName: 'Jane',
        lastName: 'Smith',
      },
    },
  },
};

export const NoSubject = {
  args: {
    deflection: {
      id: 789,
      subjectStatus: 'AWAITING_INTAKE',
      narcoticsSubstance: null,
      narcoticsParaphernalia: null,
      behavior: null,
      property: null,
      propertyDetails: null,
      propertyPhotos: [],
      deflectionDetails: [],
      subject: null,
    },
  },
};
