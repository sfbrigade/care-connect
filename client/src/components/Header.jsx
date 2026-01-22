import { Box, Container } from '@mantine/core';

import classNames from './Header.module.css';

function Header ({ children }) {
  return (
    <Box className={classNames.header}>
      <Container className={classNames.headerContainer}>
        {children}
      </Container>
    </Box>
  );
}

export default Header;
