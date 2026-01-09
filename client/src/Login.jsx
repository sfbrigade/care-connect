import { useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router';
import { Alert, Button, Container, Fieldset, Stack, Text, TextInput, Title, SegmentedControl } from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { IconMail, IconLock } from '@tabler/icons-react';

import Api from '@/Api';
import PasswordInput from '@/components/PasswordInput';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import { useStaticContext } from '@/StaticContext';

function Login () {
  const staticContext = useStaticContext();
  const authContext = useAuthContext();
  const { facility } = useFacilityContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const from = location.state?.from || searchParams.get('from') || '/';

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: isEmail('Please enter a valid email address.'),
    },
  });

  const onSubmitMutation = useMutation({
    mutationFn: ({ email, password }) => Api.auth.login(email, password),
    onSuccess: async (response) => {
      queryClient.setQueryData(['users', 'me'], response.data);
      if (response.data.organizationId === 'sfpd' || response.data.organizationId === 'sfso') {
        navigate('/units', { replace: true, state: { from } });
      } else {
        navigate(from, { replace: true });
      }
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  useEffect(() => {
    if (authContext.user && onSubmitMutation.isIdle) {
      navigate(from, { replace: true });
    }
  }, [authContext.user, onSubmitMutation.isIdle, from, navigate]);

  return (
    <>
      <Head>
        <title>Login</title>
      </Head>
      <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
        <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
          <Container>
            <Stack align='stretch'>
              <Stack align='center'>
                {/* Logo placeholder */}
                <Stack
                  justify='center'
                  w='134px'
                  h='134px'
                  bdrs='50%'
                  bg='gray.3'
                >
                  <Title align='center' order={3} fw='bold'>{facility?.name}</Title>
                </Stack>
                {/* Title */}
                <Title order={3}>
                  Login
                </Title>
              </Stack>
              {staticContext?.env?.VITE_FEATURE_REGISTRATION === 'true' && (
                <SegmentedControl
                  fullWidth
                  value='signin'
                  onChange={() => navigate('/register')}
                  data={[
                    { label: 'Login', value: 'signin' },
                    { label: 'Create an account', value: 'create' },
                  ]}
                />
              )}
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
              <TextInput
                key={form.key('email')}
                {...form.getInputProps('email')}
                label='Email'
                placeholder='youremail@example.com'
                leftSection={<IconMail size={20} color='var(--mantine-color-dark-1)' />}
              />
              <PasswordInput
                key={form.key('password')}
                {...form.getInputProps('password')}
                label='Password'
                placeholder='Enter password'
                leftSection={<IconLock size={20} color='var(--mantine-color-dark-1)' />}
              />
              <Stack align='center'>
                {/* Submit Button */}
                <Button
                  type='submit'
                  loading={onSubmitMutation.isPending}
                  fullWidth
                >
                  Login
                </Button>
                <Link
                  to='/passwords/forgot'
                >
                  <Text size='lg'>Forgot password</Text>
                </Link>
              </Stack>
            </Stack>
          </Container>
        </Fieldset>
      </form>
    </>
  );
}

export default Login;
