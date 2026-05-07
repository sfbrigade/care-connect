import { Anchor, Box, Container, Divider, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconPencilMinus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { useParams } from 'react-router';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { formatUnitName } from '@/utils/unit';

function DetailItem ({ label, value }) {
  return (
    <Box>
      <Text size='md' c='gray.6'>{label}</Text>
      <Text size='md'>{value || '-'}</Text>
    </Box>
  );
}

function ManagedUserDetailsPage () {
  const { userId } = useParams();

  const { data: user, isLoading } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => Api.users.get(userId).then(response => response.data),
  });

  const showPositionDetails = user?.organizationId === 'sfpd' || user?.organizationId === 'sfso';

  return (
    <>
      <Head>
        <title>User details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to='/manage-users' aria-label='Go back' />
        </Group>
      </Header>
      <Container>
        {isLoading && (
          <Box ta='center' py='xl'>
            <Loader />
          </Box>
        )}
        {user && (
          <Stack>
            <Box>
              <Title order={2}>{user.firstName} {user.lastName}</Title>
              {user.unit && <Text c='gray.6' size='sm'>{formatUnitName(user.unit.name)}</Text>}
            </Box>
            <Stack gap='sm'>
              <Group justify='space-between' wrap='nowrap'>
                <Title order={3}>Personal information</Title>
                <IconButtonLink icon={IconPencilMinus} to={`/manage-users/${user.id}/edit/personal`} aria-label='Edit personal information' />
              </Group>
              <DetailItem label='Name' value={`${user.firstName} ${user.lastName}`} />
              <DetailItem label='Email address' value={user.email} />
            </Stack>
            {showPositionDetails && (
              <>
                <Divider />
                <Stack gap='sm'>
                  <Group justify='space-between' wrap='nowrap'>
                    <Title order={3}>Position details</Title>
                    <IconButtonLink icon={IconPencilMinus} to={`/manage-users/${user.id}/edit/position`} aria-label='Edit position details' />
                  </Group>
                  <DetailItem label='Star number' value={user.badgeNumber} />
                  <DetailItem label='Unit' value={formatUnitName(user.unit?.name)} />
                  {user.organizationId === 'sfso' && (
                    <>
                      <DetailItem label='Rank' value={user.title?.name} />
                      <DetailItem label='Prop 115 certification' value={user.prop115Certified ? 'Yes' : 'No'} />
                    </>
                  )}
                </Stack>
              </>
            )}
            <Text size='sm' ta='center' c='gray.5'>
              For assistance with profile updates, please contact <Anchor href='mailto:careconnect@sfgov.org' underline='always'>careconnect@sfgov.org</Anchor>
            </Text>
          </Stack>
        )}
      </Container>
    </>
  );
}

export default ManagedUserDetailsPage;
