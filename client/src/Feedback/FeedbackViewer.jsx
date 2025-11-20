import { Container, Paper, Stack } from '@mantine/core';

import FeedbackForm from './FeedbackForm';

function FeedbackViewer () {
  return (
    <Container size='md' py='xl'>
      <Paper
        p='xl'
        radius={12}
        style={{
          boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #dee2e6',
        }}
      >
        <FeedbackForm />
      </Paper>
    </Container>
  );
}

export default FeedbackViewer;

