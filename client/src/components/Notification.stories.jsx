import Notification from './Notification';

export default {
  title: 'Components/Notification',
  component: Notification,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    message: {
      control: 'text',
      description: 'Notification message text',
    },
    variant: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
      description: 'Notification variant type',
    },
  },
};

export const Default = {
  args: {
    message: 'All holds extended to 11:45 AM',
    variant: 'success',
  },
};

export const Success = {
  args: {
    message: 'All holds extended to 11:45 AM',
    variant: 'success',
  },
};

export const Error = {
  args: {
    message: 'Failed to extend hold. Please try again.',
    variant: 'error',
  },
};

export const Warning = {
  args: {
    message: 'Hold expires in 5 minutes',
    variant: 'warning',
  },
};

export const Info = {
  args: {
    message: 'New beds available',
    variant: 'info',
  },
};

export const LongMessage = {
  args: {
    message: 'This is a longer notification message that might wrap to multiple lines if needed',
    variant: 'success',
  },
};

export const Floating = {
  render: () => (
    <div style={{ position: 'relative', width: '335px', height: '200px' }}>
      <Notification
        message='All holds extended to 11:45 AM'
        variant='success'
        style={{
          position: 'absolute',
          top: '16px',
          left: '12px',
          right: '12px',
        }}
      />
    </div>
  ),
};
