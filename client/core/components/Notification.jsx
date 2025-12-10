import { IconCheck } from '@tabler/icons-react';

/**
 * Notification component matching Figma design
 * Used for success notifications and other notification types
 */
function Notification ({
  message = 'All holds extended to 11:45 AM',
  variant = 'success', // 'success', 'error', 'warning', 'info'
  ...props
}) {
  const variantConfig = {
    success: {
      iconBg: '#12b886',
      iconColor: '#ffffff',
    },
    error: {
      iconBg: '#fa5252',
      iconColor: '#ffffff',
    },
    warning: {
      iconBg: '#ffc107',
      iconColor: '#212529',
    },
    info: {
      iconBg: '#339af0',
      iconColor: '#ffffff',
    },
  };

  const config = variantConfig[variant] || variantConfig.success;

  const baseStyle = {
    borderRadius: '8px',
    boxShadow: '0px 7px 7px -5px rgba(0,0,0,0.04), 0px 10px 15px -5px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.05)',
    padding: '16px 12px',
    position: 'relative',
    width: '100%',
    minHeight: '56px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#000000', // Black background
  };

  return (
    <div
      {...props}
      style={{
        ...baseStyle,
        ...props.style,
        backgroundColor: '#000000', // Ensure black background is always applied, even if overridden
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
        <IconCheck size={16} color={config.iconColor} strokeWidth={2.5} />
      </div>
      <p
        style={{
          fontSize: '14px',
          lineHeight: '20px',
          fontFamily: 'Roboto, sans-serif',
          fontWeight: 400,
          color: '#ffffff',
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
