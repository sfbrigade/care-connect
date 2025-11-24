import StatusBadge from './StatusBadge';

export default {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['active', 'open', 'expired', 'warning'],
      description: 'Status variant',
    },
  },
};

export const Active = {
  args: {
    status: 'active',
  },
};

export const Open = {
  args: {
    status: 'open',
  },
};

export const Expired = {
  args: {
    status: 'expired',
  },
};

export const Warning = {
  args: {
    status: 'warning',
  },
};

export const CustomText = {
  args: {
    status: 'active',
    children: 'Custom Status',
  },
};

export const AllStatuses = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <StatusBadge status='active' />
      <StatusBadge status='open' />
      <StatusBadge status='expired' />
      <StatusBadge status='warning' />
    </div>
  ),
};
