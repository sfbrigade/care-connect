import { Paper, Stack, Text } from '@mantine/core';

import FeedbackForm from './Feedback/FeedbackForm';

function MobileNavbar () {
  return (
    <Paper withBorder p='sm' radius='md'>
      <Stack gap='md'>
        <Stack gap={4}>
          <Text size='sm' fw={600}>
            Feedback
          </Text>
          <Paper
            p='md'
            radius={12}
            style={{
              boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #dee2e6',
            }}
          >
            <FeedbackForm />
          </Paper>
        </Stack>
        <Text size='sm'>version: 1.0.3</Text>
      </Stack>
    </Paper>
  );
}

export default MobileNavbar;
