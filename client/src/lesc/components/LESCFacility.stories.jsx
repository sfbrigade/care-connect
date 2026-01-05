import LESCFacility from './LESCFacility';

export default {
  title: 'LESC/LESCFacility',
  component: LESCFacility,
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
    facilityName: {
      control: 'text',
      description: 'Name of the LESC facility',
    },
    address: {
      control: 'text',
      description: 'Address of the facility',
    },
    bedCount: {
      control: 'number',
      description: 'Number of available beds',
    },
    bedType: {
      control: 'text',
      description: 'Type of bed',
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
    facilityName: 'RESET',
    address: '444 6th St',
    bedCount: 12,
    bedType: 'chair',
    onArrivedClick: () => console.log('I\'ve arrived clicked'),
    onHoldClick: () => console.log('Hold a Bed clicked'),
  },
};

export const NoHoldsAvailable = {
  args: {
    ...Default.args,
    bedCount: 0,
  },
};

export const Closed = {
  args: {
    ...Default.args,
    isClosed: true,
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
