import { Anchor, Box, Container, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconPencilMinus } from '@tabler/icons-react';
import { Head } from '@unhead/react';

import { useAuthContext } from '@/AuthContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';

function UserProfilePage () {
  const { user } = useAuthContext();

  return (
    <>
      <Head>
        <title>User Profile</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to='/' />
        </Group>
      </Header>
      <Container>
        <Stack>
          <Box>
            <Title order={2}>{user.firstName} {user.lastName}</Title>
            {user.unit && <Text c='gray.6' size='sm'>{user.unit?.name}</Text>}
          </Box>
          <Stack gap='sm'>
            <Title order={3}>Personal Information</Title>
            <Box>
              <Text size='md' c='gray.6'>Name</Text>
              <Text size='md'>{user.firstName} {user.lastName}</Text>
            </Box>
            <Box>
              <Text size='md' c='gray.6'>Email Address</Text>
              <Text size='md'>{user.email}</Text>
            </Box>
          </Stack>
          {(user.organizationId === 'sfpd' || user.organizationId === 'sfso') && (
            <>
              <Divider />
              <Stack gap='sm'>
                <Group justify='space-between'>
                  <Title order={3}>Position details</Title>
                  <IconButtonLink icon={IconPencilMinus} to='/profile/edit' />
                </Group>
                <Box>
                  <Text size='md' c='gray.6'>Star number</Text>
                  <Text size='md'>{user.badgeNumber}</Text>
                </Box>
                <Box>
                  <Text size='md' c='gray.6'>Unit</Text>
                  <Text size='md'>{user.unit?.name}</Text>
                </Box>
                {user.organizationId === 'sfso' && (
                  <>
                    <Box>
                      <Text size='md' c='gray.6'>Rank</Text>
                      <Text size='md'>{user.title?.name}</Text>
                    </Box>
                    <Box>
                      <Text size='md' c='gray.6'>Prop 115 certification</Text>
                      <Text size='md'>{user.prop115Certified ? 'Yes' : 'No'}</Text>
                    </Box>
                  </>
                )}
              </Stack>
            </>
          )}
          <Text size='sm' ta='center' c='gray.5'>
            For assistance with profile updates, please contact <Anchor href='mailto:careconnect@sfgov.org' underline='always'>careconnect@sfgov.org</Anchor>
          </Text>
        </Stack>
      </Container>
    </>
  );
}

export default UserProfilePage;
