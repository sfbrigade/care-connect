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

const deflection = {
  id: '0dc0363d-6a04-4eca-8e4e-5ad0158bc15a',
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
        race: 'WHITE',
      },
      behavior: 'This is the narrative',
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

export const Arrived = {
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
        race: 'WHITE',
      },
      behavior: 'This is the narrative',
      subjectStatus: 'ONSITE_AWAITING_TRANSFER'
    },
    onDetailsClick: fn(),
  }
};
