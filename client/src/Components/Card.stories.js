import { Button } from '@mantine/core';
import { IconClock, IconX } from '@tabler/icons-react';
import Card from './Card';

export default {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
    },
    subtitle: {
      control: 'text',
    },
    timeRemaining: {
      control: 'text',
    },
    timeUntil: {
      control: 'text',
    },
    details: {
      control: 'text',
    },
    badgeStatus: {
      control: 'select',
      options: ['active', 'open', 'expired', 'warning'],
    },
  },
};

export const HoldCard = {
  args: {
    timeRemaining: '59 mins',
    timeUntil: 'Until 11:15 AM',
    badgeStatus: 'active',
    details: 'Details/Notes ????',
    actions: (
      <>
        <Button variant="light" size="sm" leftSection={<IconClock size={18} />}>
          Extend
        </Button>
        <Button variant="light" size="sm" leftSection={<IconX size={18} />}>
          Cancel
        </Button>
      </>
    ),
  },
};

export const FacilityCard = {
  args: {
    title: 'Facility Name',
    subtitle: 'Service Type Name',
    badgeStatus: 'open',
    details: 'Additional information about the facility',
  },
};

export const CardWithTitle = {
  args: {
    title: 'Card Title',
    subtitle: 'Card Subtitle',
    details: 'Card details or description text',
  },
};

export const CardWithCustomBadge = {
  args: {
    title: 'Card Title',
    badge: <span style={{ padding: '4px 8px', backgroundColor: '#e9ecef', borderRadius: '24px', fontSize: '12px' }}>Custom</span>,
    details: 'Card with custom badge',
  },
};

export const EmptyCard = {
  args: {
    children: <div>Card content goes here</div>,
  },
};

