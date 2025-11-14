import { Paper, Stack, Text } from '@mantine/core';

function MobileNavbar () {
  return (
    <Paper withBorder p='sm' radius='md'>
      <Stack gap={2}>
        <Text size='sm'>version: 1.0.2</Text>
        <Text size='sm'>support: careconnect@sfgov.org</Text>
      </Stack>
    </Paper>
  );
}

export default MobileNavbar;
