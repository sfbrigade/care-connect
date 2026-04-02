import { Box, Container, Group } from '@mantine/core';

import classes from './ActionFooter.module.css';

function ActionFooter ({ children }) {
  return (
    <Box className={classes.actionFooter}>
      <Container>
        <Box className={classes.actionFooterTray}>
          <Group gap='sm'>
            {children}
          </Group>
        </Box>
      </Container>
    </Box>
  );
}

export default ActionFooter;
