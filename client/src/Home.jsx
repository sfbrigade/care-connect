import { useCallback } from 'react';

import { Alert, Button, Container, Group, List, Loader, Stack, Text, Title } from '@mantine/core';
import { Head } from '@unhead/react';
import { useQuery } from '@tanstack/react-query';

import Api from './Api';
import FacilityMap from './Components/FacilityMap';

function Home () {
  const isClient = typeof window !== 'undefined';
  const { data: facilities = [], isLoading, isError, error } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const response = await Api.facilities.list();
      if (import.meta.env.DEV) {
        console.debug('[Home] Facilities response', response.data);
      }
      return response.data;
    },
    enabled: isClient,
  });

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
          {isClient && (
            <FacilityMap facilities={facilities} />
          )}
          <Text>
            Use the button below to fire a PostHog test event. Check your PostHog Live feed to confirm the page
            is instrumented correctly.
          </Text>
          <Button onClick={handlePosthogClick}>
            Capture PostHog Test Event
          </Button>
          <Title order={2}>Facilities</Title>
          {!isClient && (
            <Alert color='blue' title='Facilities load in browser'>
              Facility data loads on the client. Please wait for the page to finish hydrating.
            </Alert>
          )}
          {isClient && isLoading && (
            <Group justify='center'>
              <Loader />
            </Group>
          )}
          {isClient && isError && (
            <Alert color='red' title='Unable to load facilities'>
              There was an issue retrieving facility data. Please try again later.
              {import.meta.env.DEV && (
                <Text mt='xs' size='xs' component='pre'>
                  {JSON.stringify(error, null, 2)}
                </Text>
              )}
            </Alert>
          )}
          {isClient && !isLoading && !isError && (
            <List spacing='xs' size='sm'>
              {facilities.map((facility) => (
                <List.Item key={facility.id}>
                  <strong>{facility.name}</strong>
                  {facility.description ? ` — ${facility.description}` : ''}
                </List.Item>
              ))}
            </List>
          )}
        </Stack>
      </Container>
    </>
  );
}

export default Home;
