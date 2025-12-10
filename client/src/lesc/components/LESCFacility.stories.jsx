import LESCFacility from './LESCFacility';

export default {
  title: 'LESC/LESCFacility',
  component: LESCFacility,
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
    intakeHours: {
      control: 'text',
      description: 'Intake hours of the facility',
    },
    lastUpdated: {
      control: 'text',
      description: 'Timestamp of last update (set to false to hide)',
    },
    onCurrentHoldsClick: {
      action: 'onCurrentHoldsClick',
      description: 'Callback for when the "Current holds" chip is clicked',
    },
    onCallClick: {
      action: 'onCallClick',
      description: 'Callback for when the "Call" button is clicked',
    },
    onHoldClick: {
      action: 'onHoldClick',
      description: 'Callback for when the "Hold a Bed" button is clicked',
    },
  },
};

export const Default = {
  args: {
    facilityName: 'Law Enforcement Sobering Center',
    address: '123 Main St, San Francisco',
    bedCount: 12,
    intakeHours: '24/7',
    lastUpdated: '10:42 AM',
    onCurrentHoldsClick: () => console.log('Current holds clicked'),
    onCallClick: () => console.log('Call clicked'),
    onHoldClick: () => console.log('Hold a Bed clicked'),
  },
};

export const NoLastUpdated = {
  args: {
    ...Default.args,
    lastUpdated: false,
  },
};
