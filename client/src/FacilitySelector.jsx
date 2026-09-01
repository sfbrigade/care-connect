import { Button, Container, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from './Api';
import EnvironmentBanner from './components/EnvironmentBanner';
import { useFacilityContext } from './FacilityContext';

function FacilitySelector ({ children }) {
  const { facility, setFacility } = useFacilityContext();

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => Api.facilities.list({ include: 'bedTypes' }).then((response) => response.data),
  });

  function onNoneClick () {
    setFacility(null);
  }

  const hasSelectedFacility = !!facility?.subdomain;
  const isSelectedFacilityMissing = hasSelectedFacility &&
    Array.isArray(facilities) &&
    !facilities.some((f) => f.id === facility.id);

  if (!!facility && (!facility.subdomain || isSelectedFacilityMissing)) {
    return (
      <>
        <Head>
          <title>Facility Selector</title>
        </Head>
        {/* This branch bypasses AppLayout, so we have to mount the env banner
            ourselves to cover real users who land here on a non-prod env. */}
        <EnvironmentBanner />
        <Container py='xl'>
          <Stack align='center' gap='xl'>
            <Stack align='center' gap='md'>
              <Title order={1} size='2.5rem' ta='center'>CareConnectSF</Title>
              <Text size='lg' c='dimmed' ta='center'>Select Facility</Text>
              {isSelectedFacilityMissing && (
                <Text size='sm' c='red.7' ta='center'>
                  Your previous facility selection is no longer available. Please choose again.
                </Text>
              )}
            </Stack>
            <Stack gap='md' align='center' style={{ width: '100%', maxWidth: '400px' }}>
              <Button
                onClick={onNoneClick}
                fullWidth
              >
                None
              </Button>
              {facilities?.map((facility) => (
                facility.subdomain
                  ? (
                    <Button
                      key={facility.id}
                      onClick={() => setFacility(facility)}
                      fullWidth
                    >
                      {facility.name}
                    </Button>
                    )
                  : null
              ))}
            </Stack>
          </Stack>
        </Container>
      </>
    );
  }
  return children;
}

export default FacilitySelector;
