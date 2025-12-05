import { useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router';
import { Alert, Box, Button, Container, Fieldset, Group, Stack, TextInput, Title, Text } from '@mantine/core';
import { hasLength, isEmail, useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '../core/Api';
import { useAuthContext } from '../core/AuthContext';
import { useStaticContext } from '../core/StaticContext';
import { getLocation } from '../core/utils/location';
import { useQueryClient } from '@tanstack/react-query';
import { StatusCodes } from 'http-status-codes';

function Login () {
  const staticContext = useStaticContext();
  const authContext = useAuthContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const from = location.state?.from || searchParams.get('from') || '/';
  // Extract pathname from Location object or use string directly
  const fromPath = useMemo(() => {
    if (!from) return '/';
    if (typeof from === 'string') return from;
    if (typeof from === 'object' && from.pathname) return from.pathname;
    return '/';
  }, [from]);
  
  // Determine which app we're logging into
  // Check from parameter first, then current pathname, then static context
  const appName = useMemo(() => {
    // Check if 'from' parameter indicates an app
    if (fromPath && fromPath.startsWith('/lesc')) {
      return 'LESC';
    }
    if (fromPath && fromPath.startsWith('/dido')) {
      return 'DIDO';
    }
    // Check current pathname
    if (location.pathname.startsWith('/lesc')) {
      return 'LESC';
    }
    if (location.pathname.startsWith('/dido')) {
      return 'DIDO';
    }
    // Fallback to location detection
    const appLocation = getLocation(staticContext);
    return appLocation?.location || null;
  }, [fromPath, location.pathname, staticContext]);

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
        <title>{appName ? `Log in - ${appName}` : 'Log in'}</title>
      </Head>
      <Container>
        <Title mb='md'>Log in</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
            <Stack w={{ base: '100%', xs: 320 }}>
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
              <TextInput
                {...form.getInputProps('email')}
                key={form.key('email')}
                label='Email'
              />
              <TextInput
                {...form.getInputProps('password')}
                key={form.key('password')}
                label='Password'
                type='password'
              />
              <Group>
                <Button type='submit'>
                  Submit
                </Button>
              </Group>
              <Box>
                <Link to='/passwords/forgot'>Forgot your password?</Link>
                {staticContext?.env?.VITE_FEATURE_REGISTRATION === 'true' && (
                  <>
                    <br />
                    <Link to='/register'>Need an account?</Link>
                  </>
                )}
              </Box>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default Login;
