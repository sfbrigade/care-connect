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
      <Card px='xl' py='0'>
        {user && (
          <>
            <Box>
              <Text size='32px'>{user.firstName} {user.lastName}</Text>
              <Text c='gray.6' size='14px'>{user.title}</Text>
            </Box>

            <Text mt='2xl' size='24px'>Personal Information</Text>

            <Box my='md'>
              <Text size='md' c='gray.6'>Name</Text>
              <Text size='md'>{user.firstName} {user.lastName}</Text>
            </Box>

            <Box>
              <Text size='md' c='gray.6'>Email Address</Text>
              <Text size='md'>{user.email}</Text>
            </Box>

            <Text mt='xl' size='14px' ta='center' c='gray.5'>
              For assistance with profile updates, please contact careconnect@sfgov.org
            </Text>
          </>
        )}
        {!user && (
          <>
            <Text size='xl'>Please log in to view this page</Text>
            <Anchor component={NavLink} to='/login'>
              Log in
            </Anchor>
          </>
        )}
      </Card>
    </>
  );
}

export default UserProfilePage;
