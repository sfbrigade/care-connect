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
    outline: 'none',
  };

  const activeStyles = {
    backgroundColor: '#343a40',
    color: '#ffffff',
  };

  const inactiveStyles = {
    backgroundColor: '#f8f9fa',
    color: '#212529',
  };

  // Merge styles: baseStyles, then props.style, then active/inactive, then ensure backgroundColor/color are last
  const { style: propsStyle, ...restProps } = props;
  const styles = {
    ...baseStyles,
    ...propsStyle,
    ...(active ? activeStyles : inactiveStyles),
    backgroundColor: active ? '#343a40' : '#f8f9fa', // Set last to prevent overrides
    color: active ? '#ffffff' : '#212529', // Set last to prevent overrides
  };

  if (onClick) {
    return (
      <button
        type='button'
        onClick={onClick}
        style={styles}
        {...restProps}
      >
        {children}
      </button>
    );
  }

  return (
    <div
      style={styles}
      {...restProps}
    >
      {children}
    </div>
  );
}

export default Chip;
