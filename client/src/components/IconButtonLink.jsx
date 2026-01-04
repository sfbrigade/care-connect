import { Button } from '@mantine/core';
import { Link } from 'react-router';

import classes from './IconButtonLink.module.css';

function IconButtonLink ({ to, icon: Icon }) {
  return (
    <Button classNames={classes} component={Link} to={to}>
      <Icon size={20} />
    </Button>
  );
}

export default IconButtonLink;
