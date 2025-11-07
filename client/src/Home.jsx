import { useCallback } from 'react';

import { Button, Container, Stack, Text, Title } from '@mantine/core';
import { Head } from '@unhead/react';

function Home () {
  const handlePosthogClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.posthog?.capture) {
      window.posthog.capture('home_test_button_clicked', {
        page: 'home',
        label: 'Test PostHog Capture',
      });
    } else {
      console.info('PostHog not initialized; skipping capture.');
    }
  }, []);

  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <Container>
        <Stack gap='md'>
          <Title>Home</Title>
          <Text>
            Use the button below to fire a PostHog test event. Check your PostHog Live feed to confirm the page
            is instrumented correctly.
          </Text>
          <Button onClick={handlePosthogClick}>
            Capture PostHog Test Event
          </Button>
        </Stack>
      </Container>
    </>
  );
}

export default Home;
