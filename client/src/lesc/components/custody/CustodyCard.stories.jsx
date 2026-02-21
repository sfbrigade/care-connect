import CustodyCard from './CustodyCard';

export default {
  title: 'LESC/Custody/CustodyCard',
  component: CustodyCard,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};

const subject = {
  id: 'bfe79463-866a-40b3-8b6a-068e716a02db',
  firstName: 'John',
  middleInitial: 'D',
  lastName: 'Doe',
  dateOfBirth: '1990-06-15',
  sex: 'MALE',
};

const baseDeflection = {
  id: 123,
  subject,
  subjectStatus: 'AWAITING_INTAKE',
};

export const AwaitingIntake = {
  args: {
    deflection: baseDeflection,
  },
};

export const ReadyForIntake = {
  args: {
    deflection: {
      ...baseDeflection,
      subjectStatus: 'READY_FOR_INTAKE',
    },
  },
};

export const Admitted = {
  args: {
    deflection: {
      ...baseDeflection,
      subjectStatus: 'ADMITTED',
    },
  },
};

export const InChair = {
  args: {
    deflection: {
      ...baseDeflection,
      subjectStatus: 'IN_CHAIR',
    },
  },
};

export const Released = {
  args: {
    deflection: {
      ...baseDeflection,
      subjectStatus: 'RELEASED',
    },
  },
};

export const Exited = {
  args: {
    deflection: {
      ...baseDeflection,
      subjectStatus: 'EXITED',
    },
  },
};

export const UnknownSubject = {
  args: {
    deflection: {
      id: 456,
      subject: null,
      subjectStatus: 'AWAITING_INTAKE',
    },
  },
};
