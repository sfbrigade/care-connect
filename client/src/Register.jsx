import { useNavigate } from 'react-router';
import { Box, Container, SegmentedControl, Stack, Title } from '@mantine/core';
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
        <title>Create an account</title>
      </Head>
      <Container>
        <Stack align='stretch'>
          <Stack align='center'>
            {/* Logo placeholder */}
            <Box
              style={{
                width: '134px',
                height: '134px',
                borderRadius: '50%',
                backgroundColor: '#f1f3f5',
              }}
            />
            {/* Title */}
            <Title order={3}>
              Create an account
            </Title>
          </Stack>
          <SegmentedControl
            fullWidth
            value='create'
            onChange={() => navigate('/login')}
            data={[
              { label: 'Log in', value: 'signin' },
              { label: 'Create an account', value: 'create' },
            ]}
          />
          <RegistrationForm onSubmitMutation={onSubmitMutation} />
        </Stack>
      </Container>
    </>
  );
}

export default Register;
