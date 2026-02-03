import { IconCheck, IconX, IconExclamationMark, IconInfoCircle } from '@tabler/icons-react';

import { colors, textColors, uiColors } from '../colors';

const notificationColors = {
  success: {
    iconBg: colors.success,
    iconColor: textColors.dark,
  },
  error: {
    iconBg: colors.error,
    iconColor: textColors.light,
  },
  warning: {
    iconBg: colors.warning,
    iconColor: textColors.dark,
  },
  info: {
    iconBg: colors.info,
    iconColor: textColors.light,
  },
};

const notificationIcon = {
  success: <IconCheck size={16} color={textColors.dark} strokeWidth={2.5} />,
  error: <IconX size={16} color={textColors.light} strokeWidth={2.5} />,
  warning: <IconExclamationMark size={16} color={textColors.dark} strokeWidth={2.5} />,
  info: <IconInfoCircle size={16} color={textColors.light} strokeWidth={2.5} />,
};

function Notification ({
  message = 'All holds extended to 11:45 AM',
  variant = 'success', // 'success', 'error', 'warning', 'info'
  ...props
}) {
  const config = notificationColors[variant] || notificationColors.success;

  const baseStyle = {
    borderRadius: '16px',
    boxShadow: '0px 7px 7px -5px rgba(0,0,0,0.04), 0px 10px 15px -5px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.05)',
    padding: '16px 12px',
    position: 'relative',
    width: '100%',
    minHeight: '56px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: uiColors.background.dark,
  };

  return (
    <div
      {...props}
      style={{
        ...baseStyle,
        ...props.style,
        backgroundColor: uiColors.background.dark,
      }}
    >
      <div
        style={{
          backgroundColor: config.iconBg,
          borderRadius: '32px',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: '24px',
          height: '24px',
        }}
      >
        {notificationIcon[variant] || notificationIcon.success}
      </div>
      <p
        style={{
          fontSize: '14px',
          lineHeight: '20px',
          fontFamily: 'Roboto, sans-serif',
          fontWeight: 400,
          color: uiColors.text.light,
          flex: 1,
          margin: 0,
          padding: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
}

export default Notification;
