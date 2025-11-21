import { Box } from '@mantine/core';

/**
 * Chip component for filters and selections
 * Matches Figma design with active/inactive states
 */
function Chip ({ 
  children, 
  active = false, 
  onClick,
  variant = 'filter', // 'filter' or 'selection'
  ...props 
}) {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 20px',
    borderRadius: '24px',
    fontSize: '16px',
    lineHeight: '24px',
    fontFamily: 'Roboto, sans-serif',
    fontWeight: 400,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    border: 'none',
    ...props.style,
  };

  const activeStyles = {
    backgroundColor: '#343a40',
    color: '#ffffff',
  };

  const inactiveStyles = {
    backgroundColor: '#f8f9fa',
    color: '#212529',
  };

  const styles = {
    ...baseStyles,
    ...(active ? activeStyles : inactiveStyles),
  };

  return (
    <Box
      component={onClick ? 'button' : 'div'}
      onClick={onClick}
      style={styles}
      {...props}
    >
      {children}
    </Box>
  );
}

export default Chip;

