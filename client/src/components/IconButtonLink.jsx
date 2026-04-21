import { Button } from '@mantine/core';
import { Link } from 'react-router';

import classes from './IconButtonLink.module.css';

function IconButtonLink ({ to, variant, color, icon: Icon, onClick }) {
  if (!to) {
    return (
      <Button className={variant === 'primary' ? '' : classes.default} color={color} classNames={classes} onClick={onClick} type='button'>
        <Icon size={20} />
      </Button>
    );
  }

  return (
    <Button className={variant === 'primary' ? '' : classes.default} color={color} classNames={classes} component={Link} to={to} onClick={onClick}>
      <Icon size={20} />
    </Button>
  );
}

export default IconButtonLink;
