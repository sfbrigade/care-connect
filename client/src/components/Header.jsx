import { Box, Container } from '@mantine/core';
import classNames from 'classnames';

import classes from './Header.module.css';

function Header ({ children, className }) {
  return (
    <Box className={classNames(classes.header, className)}>
      <Container className={classes.headerContainer}>
        {children}
      </Container>
    </Box>
  );
}

export default Header;
