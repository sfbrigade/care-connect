import Incident from './Incident';

export default {
  title: 'LESC/Incident',
  component: Incident,
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    incident: {
      description: 'Incident object',
    },
    editLink: {
      description: 'Link for the "Edit" button',
    },
  },
};

export const Default = {
  args: {
    incident: {
      cadNumber: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      latitude: '',
      longitude: '',
      arrestedAt: '',
      supervisorBadgeNumber: '',
    },
    editLink: '/edit',
  },
};

export const WithCadNumber = {
  args: {
    incident: {
      ...Default.args.incident,
      cadNumber: '12345',
    },
    editLink: '/edit',
  },
};

export const WithAddress = {
  args: {
    incident: {
      ...Default.args.incident,
      addressLine1: '123 Main St',
      addressLine2: 'Apt 1',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
    },
    editLink: '/edit',
  },
};

export const WithDate = {
  args: {
    incident: {
      ...Default.args.incident,
      arrestedAt: '2022-01-01T12:34:56Z',
    },
    editLink: '/edit',
  },
};

export const WithCadNumberAddressDate = {
  args: {
    incident: {
      ...Default.args.incident,
      cadNumber: '12345',
      addressLine1: '123 Main St',
      addressLine2: 'Apt 1',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      arrestedAt: '2022-01-01T12:34:56Z',
    },
    editLink: '/edit',
  },
};

export const Complete = {
  args: {
    incident: {
      ...Default.args.incident,
      cadNumber: '12345',
      addressLine1: '123 Main St',
      addressLine2: 'Apt 1',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      arrestedAt: '2022-01-01T12:34:56Z',
      supervisorBadgeNumber: '1234',
    },
    editLink: '/edit',
  },
};
