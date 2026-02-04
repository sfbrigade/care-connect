import { NavLink } from 'react-router';
import { useAuthContext } from '@/AuthContext';
import { Anchor, Box, Card, Text } from '@mantine/core';

function UserProfilePage () {
  const { user } = useAuthContext();
  return (
    <>
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
