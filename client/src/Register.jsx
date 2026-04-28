import { useLocation, useNavigate } from 'react-router';
import { Box, Container, SegmentedControl, Stack, Title } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';
import RegistrationForm from './RegistrationForm';

function Register () {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/';

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.auth.register(values),
    onSuccess: (response) => {
      queryClient.setQueryData(['users', 'me'], (old) => ({ ...(old ?? {}), ...response.data }));
      if (response.data.organizationId === 'sfpd' || response.data.organizationId === 'sfso') {
        navigate('/units', { replace: true, state: { from } });
      } else {
        navigate(from);
      }
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
