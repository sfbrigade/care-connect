import { useNavigate, Link } from 'react-router';
import { Box, Container, Stack, Title } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import RegistrationForm from './RegistrationForm';

function Register () {
  const authContext = useAuthContext();
  const navigate = useNavigate();

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.auth.register(values),
    onSuccess: (response) => {
      authContext.setUser(response.data);
      navigate('/');
    },
    onError: () => window.scrollTo(0, 0),
  });

  return (
    <>
      <Head>
        <title>Register</title>
      </Head>
      <Container>
        <Title mb='md'>Register</Title>
        <Stack>
          <RegistrationForm onSubmitMutation={onSubmitMutation} />
          <Box>
            <Link to='/login'>Already have an account?</Link>
          </Box>
        </Stack>
      </Container>
    </>
  );
}

export default Register;
