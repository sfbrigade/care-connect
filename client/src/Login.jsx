import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router';
import { ActionIcon, Alert, Box, Button, Container, Fieldset, Stack, TextInput, Title, SegmentedControl } from '@mantine/core';
import { hasLength, isEmail, useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { IconMail, IconLock, IconEye, IconEyeOff } from '@tabler/icons-react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useStaticContext } from '@/StaticContext';
import { StatusCodes } from 'http-status-codes';

function Login () {
  const staticContext = useStaticContext();
  const authContext = useAuthContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const from = location.state?.from || searchParams.get('from') || '/';

  useEffect(() => {
    if (authContext.user) {
      navigate(from, { replace: true });
    }
  }, [authContext.user, from, navigate]);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: isEmail('Please enter a valid email address.'),
      password: hasLength({ min: 8 }, 'Passwords must be at least 8 characters.'),
    },
  });

  const onSubmitMutation = useMutation({
    mutationFn: ({ email, password }) => Api.auth.login(email, password),
    onSuccess: async (response) => {
      // Update user state immediately from login response
      if (response.status === StatusCodes.OK && response.data) {
        authContext.setUser(response.data);
      }
      // Invalidate and refetch user query to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      navigate(from, { replace: true });
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  return (
    <>
      <Head>
        <title>Log in</title>
      </Head>
      <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
        <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
          <Container size='xs'>
            <Stack align='stretch' gap='xl'>
              <Stack align='center' gap='xl'>
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
                  Log in
                </Title>
              </Stack>
              {staticContext?.env?.VITE_FEATURE_REGISTRATION === 'true' && (
                <SegmentedControl
                  fullWidth
                  value='signin'
                  onChange={() => navigate('/register')}
                  data={[
                    { label: 'Sign in', value: 'signin' },
                    { label: 'Create account', value: 'create' },
                  ]}
                />
              )}
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
              <TextInput
                key={form.key('email')}
                {...form.getInputProps('email')}
                label='Email'
                placeholder='email@example.com'
                leftSection={<IconMail size={20} color='#868e96' />}
              />
              <TextInput
                key={form.key('password')}
                {...form.getInputProps('password')}
                label='Password'
                placeholder='Password'
                type={passwordVisible ? 'text' : 'password'}
                leftSection={<IconLock size={20} color='#868e96' />}
                rightSection={
                  <ActionIcon
                    variant='transparent'
                    onClick={() => setPasswordVisible(!passwordVisible)}
                  >
                    {passwordVisible
                      ? (
                        <IconEyeOff size={20} color='#868e96' />
                        )
                      : (
                        <IconEye size={20} color='#868e96' />
                        )}
                  </ActionIcon>
                }
              />
              <Stack align='center' gap='xl'>
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
                  Forgot password
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
