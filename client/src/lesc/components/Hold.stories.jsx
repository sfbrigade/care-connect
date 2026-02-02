import { fn } from 'storybook/test';
import Hold from './Hold';

export default {
  title: 'LESC/Hold',
  component: Hold,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};

const incident = {
  id: '000123',
  addressLine1: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  arrestedAt: new Date().toISOString(),
  cadNumber: '123456789A',
  supervisorBadgeNumber: '1234',
};

const deflection = {
  id: '012345',
  subjectId: null,
  subject: null,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 59 * 60 * 1000).toISOString(),
  status: 'ACTIVE',
};

export const Default = {
  args: {
    deflection,
    onDetailsClick: fn(),
  },
};

export const WithSomeSubjectDetails = {
  args: {
    deflection: {
      ...deflection,
      subjectId: 'bfe79463-866a-40b3-8b6a-068e716a02db',
      subject: {
        id: 'bfe79463-866a-40b3-8b6a-068e716a02db',
        firstName: 'John',
        middleInitial: 'D',
        lastName: 'Doe',
        dateOfBirth: '2000-01-01',
        sex: 'MALE',
      },
    },
    onDetailsClick: fn(),
  },
};

export const WithAllDetails = {
  args: {
    incident,
    deflection: {
      ...deflection,
      subjectId: 'bfe79463-866a-40b3-8b6a-068e716a02db',
      subject: {
        id: 'bfe79463-866a-40b3-8b6a-068e716a02db',
        firstName: 'John',
        middleInitial: 'D',
        lastName: 'Doe',
        dateOfBirth: '2000-01-01T00:00:00.000Z',
        sex: 'MALE',
        race: 'WHITE',
      },
      narcoticsSubstance: false,
      narcoticsParaphernalia: false,
      deflectionDetails: [
        {
          id: 'unable_to_care_for_basic_needs'
        }
      ],
      behavior: 'This is the narrative',
      property: 'NONE',
    },
    onDetailsClick: fn(),
  },
};

export const ExpiringSoon = {
  args: {
    deflection: {
      ...deflection,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
    onDetailsClick: fn(),
  },
};

export const ArrivedIncomplete = {
  args: {
    deflection: {
      ...deflection,
      subjectId: 'bfe79463-866a-40b3-8b6a-068e716a02db',
      subject: {
        id: 'bfe79463-866a-40b3-8b6a-068e716a02db',
      },
      behavior: 'This is the narrative',
      subjectStatus: 'ONSITE_AWAITING_TRANSFER'
    },
    onDetailsClick: fn(),
  }
};

export const ArrivedComplete = {
  args: {
    ...WithAllDetails.args,
    deflection: {
      ...WithAllDetails.args.deflection,
      subjectStatus: 'ONSITE_AWAITING_TRANSFER'
    },
  }
};

export const CancelledEmpty = {
  args: {
    ...Default.args,
    deflection: {
      ...Default.args.deflection,
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
    },
  }
};

export const CancelledWithSomeDetails = {
  args: {
    ...WithSomeSubjectDetails.args,
    deflection: {
      ...WithSomeSubjectDetails.args.deflection,
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
    },
  }
};

export const ExpiredTimer = {
  args: {
    deflection: {
      ...deflection,
      expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    onDetailsClick: fn(),
  },
};

export const ExpiredStatus = {
  args: {
    deflection: {
      ...deflection,
      expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'EXPIRED',
    },
    onDetailsClick: fn(),
  },
};

export const ExpiredTimerWithSomeDetails = {
  args: {
    deflection: {
      ...WithSomeSubjectDetails.args.deflection,
      expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    onDetailsClick: fn(),
  },
};

export const ExpiredStatusWithSomeDetails = {
  args: {
    deflection: {
      ...WithSomeSubjectDetails.args.deflection,
      expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'EXPIRED',
    },
    onDetailsClick: fn(),
  },
};
