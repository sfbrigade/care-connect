import { Paper, Stack, Text } from '@mantine/core';

function MobileNavbar () {
  return (
    <Paper withBorder p='sm' radius='md'>
      <Stack gap={2}>
        <Text size='sm'>version: 1.0</Text>
        <Text size='sm'>support: TBD</Text>
      </Stack>
    </Paper>
  );
}

export default MobileNavbar;

