import { Notification as MantineNotification } from '@mantine/core';
import { IconCheck, IconX, IconExclamationMark, IconInfoCircle } from '@tabler/icons-react';

const variants = {
  success: {
    icon: <IconCheck size={16} color='var(--mantine-color-dark-6)' strokeWidth={2.5} />,
    color: 'teal.3',
  },
  error: {
    icon: <IconX size={16} color='white' strokeWidth={2.5} />,
    color: 'red.6',
  },
  warning: {
    icon: <IconExclamationMark size={16} color='var(--mantine-color-dark-6)' strokeWidth={2.5} />,
    color: 'yellow.7',
  },
  info: {
    icon: <IconInfoCircle size={16} color='white' strokeWidth={2.5} />,
    color: 'indigo.6',
  },
};

function Notification ({
  message = 'All holds extended to 11:45 AM',
  messageSecondary,
  variant = 'success', // 'success', 'error', 'warning', 'info'
  onDismiss,
  ...props
}) {
  const config = variants[variant] || variants.success;
  return (
    <MantineNotification
      {...props}
      title={message}
      onClose={onDismiss}
      icon={config.icon}
      color={config.color}
    >
      {messageSecondary}
    </MantineNotification>
  );
}

export default Notification;
