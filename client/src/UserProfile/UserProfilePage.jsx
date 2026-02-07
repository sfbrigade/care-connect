import { NavLink } from 'react-router';
import { useAuthContext } from '@/AuthContext';
import { IconArrowLeft } from '@tabler/icons-react';
import { Head } from '@unhead/react';
import Header from '@/components/Header';
import { Anchor, Box, Card, Group, Text } from '@mantine/core';
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
      <Card padding='xl'>
        {user && (
          <>
            <Text size='xl'>Personal Information</Text>
            <Box my='md'>
              <Text size='sm' c='gray'>Name</Text>
              <Text size='sm'>{user.firstName} {user.lastName}</Text>
            </Box>

            <Box>
              <Text size='sm' c='gray'>Email Address</Text>
              <Text size='sm'>{user.email}</Text>
            </Box>

            <Text mt='md' size='xs' ta='center' c='gray.5'>
              For assistance with profile updates, please contact careconnect@sfgov.org
            </Text>
          </>
        )}
        {!user && (
          <>
            <Text size='xl'>Please log in to view this page</Text>
            <Anchor component={NavLink} to='/login' onClick={close}>
              Log in
            </Anchor>
          </>
        )}
      </Card>
    </>
  );
}

export default UserProfilePage;
