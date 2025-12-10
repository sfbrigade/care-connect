import { Box } from '@mantine/core';

/**
 * StatusBadge component for status indicators
 * Matches Figma design with different status variants
 */
function StatusBadge ({
  status = 'active', // 'active', 'open', 'expired', 'warning'
  children,
  ...props
}) {
  const statusConfig = {
    active: {
      backgroundColor: 'rgba(18, 184, 134, 0.1)', // #12b886 with 10% opacity
      color: '#12b886',
      text: 'Active',
    },
    open: {
      backgroundColor: 'rgba(18, 184, 134, 0.1)',
      color: '#12b886',
      text: 'Open',
    },
    expired: {
      backgroundColor: 'rgba(250, 82, 82, 0.1)', // #fa5252 with 10% opacity
      color: '#fa5252',
      text: 'Expired',
    },
    warning: {
      backgroundColor: 'rgba(255, 193, 7, 0.1)', // yellow with 10% opacity
      color: '#ffc107',
      text: 'Warning',
    },
    'in-transit': {
      backgroundColor: 'rgba(76, 110, 245, 0.1)', // #4c6ef5 with 10% opacity
      color: '#4c6ef5',
      text: 'In transit',
    },
  };

  const config = statusConfig[status] || statusConfig.active;

  const styles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '24px',
    fontSize: '12px',
    lineHeight: '16px',
    fontFamily: 'Roboto, sans-serif',
    fontWeight: 400,
    backgroundColor: config.backgroundColor,
    color: config.color,
    ...props.style,
  };

  return (
    <Box style={styles} {...props}>
      {children || config.text}
    </Box>
  );
}

export default StatusBadge;
