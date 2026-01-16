import Facility from './Facility';

export default {
  title: 'LESC/Facility',
  component: Facility,
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
    facility: {
      description: 'Facility object',
    },
    bedTypes: {
      description: 'Bed types array',
    },
    arrivedAt: {
      description: 'Arrived at date',
    },
    leftAt: {
      description: 'Left at date',
    },
    onArrivedClick: {
      action: 'onArrivedClick',
      description: 'Callback for when the "I\'ve arrived" button is clicked',
    },
    onHoldClick: {
      action: 'onHoldClick',
      description: 'Callback for when the "Hold a Bed" button is clicked',
    },
  },
};

export const Default = {
  args: {
    facility: {
      name: 'RESET',
      addressLine1: '444 6th St',
      status: 'OPEN_ACCEPTING',
    },
    bedTypes: [
      {
        type: 'CHAIR',
        available: 16,
      },
    ],
    onArrivedClick: () => console.log('I\'ve arrived clicked'),
    onHoldClick: () => console.log('Hold a Bed clicked'),
  },
};

export const NoHoldsAvailable = {
  args: {
    ...Default.args,
    bedTypes: [
      {
        type: 'CHAIR',
        available: 0,
      },
    ],
  },
};

export const Closed = {
  args: {
    ...Default.args,
    facility: {
      ...Default.args.facility,
      status: 'CLOSED',
    },
  },
};

export const Arrived = {
  args: {
    ...Default.args,
    arrivedAt: new Date(),
  }
};

export const Left = {
  args: {
    ...Default.args,
    arrivedAt: new Date(),
    leftAt: new Date(),
  }
};
