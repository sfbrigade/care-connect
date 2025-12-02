import { Button } from '@mantine/core';
import LESCCard from './LESCCard';

export default {
  title: 'Components/LESCCard',
  component: LESCCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    facilityName: {
      control: 'text',
    },
    address: {
      control: 'text',
    },
    bedCount: {
      control: 'number',
    },
    status: {
      control: 'select',
      options: ['open', 'closed'],
    },
  },
};

export const Default = {
  args: {
    facilityName: 'LESC',
    address: '123 Main St, San Francisco',
    bedCount: 10,
    status: 'open',
    intakeHours: '24/7',
  },
};

export const WithActions = {
  args: {
    facilityName: 'LESC',
    address: '123 Main St, San Francisco',
    bedCount: 10,
    status: 'open',
    intakeHours: '24/7',
    actions: (
      <>
        <Button variant='light' size='sm'>Action 1</Button>
        <Button variant='light' size='sm'>Action 2</Button>
      </>
    ),
  },
};

export const Closed = {
  args: {
    facilityName: 'LESC',
    address: '123 Main St, San Francisco',
    bedCount: 0,
    status: 'closed',
    intakeHours: '24/7',
  },
};

export const CustomLastUpdated = {
  args: {
    facilityName: 'LESC',
    address: '123 Main St, San Francisco',
    bedCount: 10,
    status: 'open',
    intakeHours: '24/7',
    lastUpdated: '10:42 AM',
  },
};

export const NoLastUpdated = {
  args: {
    facilityName: 'LESC',
    address: '123 Main St, San Francisco',
    bedCount: 10,
    status: 'open',
    intakeHours: '24/7',
    lastUpdated: false,
  },
};
