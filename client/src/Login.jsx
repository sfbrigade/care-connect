import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router';
import { Alert, Box, Button, Container, Fieldset, Stack, TextInput, Title, SegmentedControl, Text } from '@mantine/core';
import { hasLength, isEmail, useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { IconMail, IconLock, IconEye, IconEyeOff } from '@tabler/icons-react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useStaticContext } from '@/StaticContext';
import { getLocation } from '@/utils/location';
import { StatusCodes } from 'http-status-codes';

function Login () {
  const staticContext = useStaticContext();
  const authContext = useAuthContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [viewMode, setViewMode] = useState('signin');

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

  // Navigate to register when switching to create account
  useEffect(() => {
    if (viewMode === 'create' && staticContext?.env?.VITE_FEATURE_REGISTRATION === 'true') {
      navigate('/register', { replace: false });
    }
  }, [viewMode, navigate, staticContext]);

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
      <Container
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
        }}
      >
        {/* Logo placeholder */}
        <Box
          style={{
            width: '134px',
            height: '134px',
            borderRadius: '50%',
            backgroundColor: '#f1f3f5',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />

        {/* Title */}
        <Title
          order={3}
          mb='md'
          style={{
            fontSize: '24px',
            lineHeight: '32px',
            fontWeight: 700,
            color: '#000000',
            marginBottom: '32px',
          }}
        >
          Log in
        </Title>

        {/* Segmented Control */}
        {staticContext?.env?.VITE_FEATURE_REGISTRATION === 'true' && (
          <Box mb='xl' style={{ width: '335px', maxWidth: '100%' }}>
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              data={[
                { label: 'Sign in', value: 'signin' },
                { label: 'Create account', value: 'create' },
              ]}
              fullWidth
              styles={{
                root: {
                  backgroundColor: '#f1f3f5',
                  borderRadius: '24px',
                  padding: '4px',
                },
                indicator: {
                  backgroundColor: '#ffffff',
                  borderRadius: '24px',
                  boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.1), 0px 1px 3px 0px rgba(0,0,0,0.05)',
                },
                label: {
                  fontSize: '16px',
                  lineHeight: '24px',
                  fontWeight: 400,
                  padding: '6px 20px',
                },
              }}
            />
          </Box>
        )}

        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)} style={{ width: '335px', maxWidth: '100%' }}>
          <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='xs'>
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
              
              {/* Email Input */}
              <Box>
                <Text
                  component='label'
                  style={{
                    fontSize: '18px',
                    lineHeight: '28px',
                    fontWeight: 600,
                    color: '#000000',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Email
                </Text>
                <TextInput
                  {...form.getInputProps('email')}
                  key={form.key('email')}
                  placeholder='email@example.com'
                  leftSection={<IconMail size={24} color='#868e96' />}
                  styles={{
                    input: {
                      height: '48px',
                      fontSize: '18px',
                      lineHeight: '28px',
                      paddingLeft: '48px',
                      borderRadius: '8px',
                      borderColor: '#dee2e6',
                    },
                    section: {
                      marginLeft: '16px',
                    },
                  }}
                />
                <Box style={{ height: '24px', marginTop: '4px' }}>
                  <Text
                    style={{
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#868e96',
                    }}
                  >
                    &nbsp;
                  </Text>
                </Box>
              </Box>

              {/* Password Input */}
              <Box>
                <Text
                  component='label'
                  style={{
                    fontSize: '18px',
                    lineHeight: '28px',
                    fontWeight: 600,
                    color: '#000000',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Password
                </Text>
                <TextInput
                  {...form.getInputProps('password')}
                  key={form.key('password')}
                  placeholder='Password'
                  type={passwordVisible ? 'text' : 'password'}
                  leftSection={<IconLock size={24} color='#868e96' />}
                  rightSection={
                    <Box
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {passwordVisible ? (
                        <IconEyeOff size={24} color='#868e96' />
                      ) : (
                        <IconEye size={24} color='#868e96' />
                      )}
                    </Box>
                  }
                  styles={{
                    input: {
                      height: '48px',
                      fontSize: '18px',
                      lineHeight: '28px',
                      paddingLeft: '48px',
                      paddingRight: '48px',
                      borderRadius: '8px',
                      borderColor: '#dee2e6',
                    },
                    section: {
                      marginLeft: '16px',
                      marginRight: '16px',
                    },
                  }}
                />
                <Box style={{ height: '20px', marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Link
                    to='/passwords/forgot'
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#868e96',
                      textDecoration: 'none',
                    }}
                  >
                    Forgot password
                  </Link>
                </Box>
              </Box>

              {/* Submit Button */}
              <Button
                type='submit'
                loading={onSubmitMutation.isPending}
                fullWidth
                style={{
                  backgroundColor: '#4c6ef5',
                  borderRadius: '32px',
                  height: '48px',
                  fontSize: '18px',
                  lineHeight: '28px',
                  fontWeight: 600,
                  color: '#ffffff',
                  marginTop: '24px',
                }}
              >
                Sign in
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default Login;
