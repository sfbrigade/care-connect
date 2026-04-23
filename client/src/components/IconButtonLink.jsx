import { Button } from '@mantine/core';
import { Link } from 'react-router';

import classes from './IconButtonLink.module.css';

function IconButtonLink ({ to, variant, color, icon: Icon, onClick, 'aria-label': ariaLabel }) {
  return (
    <Button className={variant === 'primary' ? '' : classes.default} color={color} classNames={classes} component={Link} to={to} onClick={onClick} aria-label={ariaLabel}>
      <Icon size={20} />
    </Button>
  );
}

export default IconButtonLink;
