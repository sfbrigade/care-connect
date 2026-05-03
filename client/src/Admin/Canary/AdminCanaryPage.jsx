import { useState } from 'react';
import { Button, Card, Container, Stack, Text, Title } from '@mantine/core';

import Api from '@/Api';

function ExplodingChild () {
  throw new Error('Canary: FE render');
}

function AdminCanaryPage () {
  const [renderExplode, setRenderExplode] = useState(false);

  function triggerRenderError () {
    setRenderExplode(true);
  }

  function triggerUnhandledRejection () {
    Promise.reject(new Error('Canary: FE unhandled rejection'));
  }

  async function triggerApiError () {
    try {
      await Api.canary.error();
    } catch (err) {
      // Expected: server returns 500. We swallow here so the error lands in PostHog
      // via the server-side capture, not the client's network-failure path.
    }
  }

  async function triggerJobError () {
    await Api.canary.job();
  }

  return (
    <Container>
      <Stack gap='md'>
        <Title order={2}>Canary errors</Title>
        <Text c='dimmed'>
          Each button triggers a known error on one surface. Verify it appears in PostHog &gt; Error Tracking
          with the matching <code>Canary:</code> prefix.
        </Text>

        <Card bg='white' p='xl' withBorder>
          <Stack gap='sm'>
            <Title order={4}>Browser</Title>
            <Button color='red' variant='light' onClick={triggerRenderError}>
              Throw FE render error
            </Button>
            <Button color='red' variant='light' onClick={triggerUnhandledRejection}>
              Throw FE unhandled rejection
            </Button>
          </Stack>
        </Card>

        <Card bg='white' p='xl' withBorder>
          <Stack gap='sm'>
            <Title order={4}>Server</Title>
            <Button color='red' variant='light' onClick={triggerApiError}>
              Throw API error (500)
            </Button>
            <Button color='red' variant='light' onClick={triggerJobError}>
              Throw worker job error
            </Button>
          </Stack>
        </Card>

        {renderExplode && <ExplodingChild />}
      </Stack>
    </Container>
  );
}

export default AdminCanaryPage;
