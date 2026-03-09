import StatusAccordion from './StatusAccordion';
import CustodyCard from './custody/CustodyCard';

export default {
  title: 'LESC/StatusAccordion',
  component: StatusAccordion,
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

const makeDeflection = (id, subjectStatus) => ({
  id,
  subject,
  subjectStatus,
});

const inCustodySections = [
  { status: 'AWAITING_INTAKE', label: 'Pending Safety Checks', description: 'Update subject details as needed before completing the safety check.' },
  { status: 'READY_FOR_INTAKE', label: 'Ready for Medical Intake' },
  { status: 'ADMITTED', label: 'In Medical Intake' },
  { status: 'IN_CHAIR', label: 'In-chair' },
];

const releasedSections = [
  { status: 'RELEASED', label: 'Still onsite' },
  { status: 'EXITED', label: 'Exited facility' },
];

export const SfsoInCustodyWithItems = {
  args: {
    sections: inCustodySections,
    groupedDeflections: {
      AWAITING_INTAKE: [makeDeflection(1, 'AWAITING_INTAKE'), makeDeflection(2, 'AWAITING_INTAKE')],
      READY_FOR_INTAKE: [makeDeflection(3, 'READY_FOR_INTAKE')],
      ADMITTED: [],
      IN_CHAIR: [],
    },
    renderCard: (d) => <CustodyCard key={d.id} deflection={d} />,
  },
};

export const SfsoNotInCustodyWithItems = {
  args: {
    sections: releasedSections,
    defaultOpen: ['RELEASED', 'EXITED'],
    groupedDeflections: {
      RELEASED: [makeDeflection(4, 'RELEASED')],
      EXITED: [makeDeflection(5, 'EXITED'), makeDeflection(6, 'EXITED')],
    },
    renderCard: (d) => <CustodyCard key={d.id} deflection={d} />,
  },
};

export const SfsoAllEmpty = {
  args: {
    sections: inCustodySections,
    groupedDeflections: {},
    renderCard: (d) => <CustodyCard key={d.id} deflection={d} />,
  },
};
