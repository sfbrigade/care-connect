import { Button } from '@mantine/core';
import { Link } from 'react-router';

import classes from './IconButtonLink.module.css';

function IconButtonLink ({ to, variant, icon: Icon }) {
  return (
    <Button className={variant === 'primary' ? '' : classes.default} classNames={classes} component={Link} to={to}>
      <Icon size={20} />
    </Button>
  );
}

export default IconButtonLink;
