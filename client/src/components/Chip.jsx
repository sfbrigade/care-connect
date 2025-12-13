/**
 * Chip component for filters and selections
 * Matches Figma design with active/inactive states
 */
function Chip ({
  children,
  active = false,
  onClick,
  disabled = false,
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
    cursor: disabled ? 'not-allowed' : (onClick ? 'pointer' : 'default'),
    transition: 'all 0.2s ease',
    border: 'none',
    outline: 'none',
    opacity: disabled ? 0.5 : 1,
  };

  const activeStyles = {
    backgroundColor: '#343a40',
    color: '#ffffff',
  };

  const inactiveStyles = {
    backgroundColor: '#f8f9fa',
    color: '#212529',
  };

  const disabledStyles = {
    backgroundColor: '#e9ecef',
    color: '#868e96',
  };

  // Merge styles: baseStyles, then props.style, then active/inactive/disabled, then ensure backgroundColor/color are last
  const { style: propsStyle, ...restProps } = props;
  const customBackgroundColor = propsStyle?.backgroundColor;
  const customColor = propsStyle?.color;
  const styles = {
    ...baseStyles,
    ...propsStyle,
    ...(disabled ? disabledStyles : (active ? activeStyles : inactiveStyles)),
    backgroundColor: customBackgroundColor || (disabled ? '#e9ecef' : (active ? '#343a40' : '#f8f9fa')), // Use custom backgroundColor if provided
    color: customColor || (disabled ? '#868e96' : (active ? '#ffffff' : '#212529')), // Use custom color if provided
  };

  if (onClick) {
    return (
      <button
        type='button'
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
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
