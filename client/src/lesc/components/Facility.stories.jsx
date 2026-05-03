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
    hasActiveHold: {
      description: 'Whether the current user has an active hold',
    },
    onArrivedClick: {
      action: 'onArrivedClick',
      description: 'Callback for when the "I\'ve arrived" button is clicked',
    },
    isArrivalPending: {
      description: 'Whether the arrival/leave action is pending',
    },
    onLeftClick: {
      action: 'onLeftClick',
      description: 'Callback for when the "I\'ve left" button is clicked',
    },
    transferCodeStatus: {
      description: 'Transfer-code readiness status shown below the CTA',
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
    hasActiveHold: true,
    onArrivedClick: () => console.log('I\'ve arrived clicked'),
    onLeftClick: () => console.log('I\'ve left clicked'),
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

export const NoActiveHold = {
  args: {
    ...Default.args,
    hasActiveHold: false,
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
    arrivedAt: new Date().toISOString(),
    atFacility: true,
    transferCodeStatus: {
      icon: 'ready',
      label: 'Transfer codes ready',
    },
  },
};

export const Left = {
  args: {
    ...Default.args,
    arrivedAt: new Date().toISOString(),
    atFacility: true,
  },
};

export const ReadyToArrive = {
  args: {
    ...Default.args,
    canArrive: true,
    transferCodeStatus: {
      icon: 'locked',
      label: 'Tap to unlock transfer code',
    },
  },
};
