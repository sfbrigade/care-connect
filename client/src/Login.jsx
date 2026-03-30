import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router';
import { Alert, Button, Container, Fieldset, Group, PinInput, Stack, Text, TextInput, Title, SegmentedControl } from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { IconMail, IconLock, IconArrowLeft } from '@tabler/icons-react';
import { DateTime } from 'luxon';

import Api from '@/Api';
import useNow from '@/hooks/useNow';
import PasswordInput from '@/components/PasswordInput';
import IconButtonLink from '@/components/IconButtonLink';
import { useAuthContext } from '@/AuthContext';
import { useFacilityContext } from '@/FacilityContext';
import { useStaticContext } from '@/StaticContext';
import { useToast } from '@/components/ToastContext';

function Login () {
  const staticContext = useStaticContext();
  const authContext = useAuthContext();
  const { facility } = useFacilityContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const from = location.state?.from || searchParams.get('from') || '/';

  const [step, setStep] = useState('credentials');
  const [mfaToken, setMfaToken] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState(null);
  const now = useNow(1000, step === 'verify' && resendAvailableAt !== null);
  const resendCooldown = resendAvailableAt ? Math.max(0, Math.ceil(DateTime.fromJSDate(resendAvailableAt).diff(now, 'seconds').seconds)) : 0;

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

  const verifyForm = useForm({
    mode: 'controlled',
    initialValues: {
      code: '',
    },
  });


  const onLoginSuccess = useCallback((userData) => {
    queryClient.setQueryData(['users', 'me'], userData);
    if (userData.organizationId === 'sfpd' || userData.organizationId === 'sfso') {
      navigate('/units', { replace: true, state: { from } });
    } else {
      navigate(from, { replace: true });
    }
  }, [queryClient, navigate, from]);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => Api.auth.login(email, password),
    onSuccess: async (response) => {
      if (response.data.mfaRequired) {
        setMfaToken(response.data.mfaToken);
        setMaskedEmail(response.data.email);
        setStep('verify');
        setResendAvailableAt(null);
      } else {
        onLoginSuccess(response.data);
      }
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ token, code }) => Api.auth.verifyCode(token, code),
    onSuccess: async (response) => {
      onLoginSuccess(response.data);
    },
    onError: (errors) => {
      if (errors._form) {
        showToast(errors._form, 'error');
      } else {
        verifyForm.setErrors(errors);
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: ({ token }) => Api.auth.resendCode(token),
    onSuccess: async (response) => {
      setMfaToken(response.data.mfaToken);
      setMaskedEmail(response.data.email);
      setResendAvailableAt(new Date(Date.now() + 30000));
      showToast('A new code has been sent', 'success', 4000, 'Check your email.');
    },
    onError: (errors) => {
      if (errors._form) {
        showToast(errors._form, 'error');
      }
    },
  });

  function handleBackToLogin () {
    setStep('credentials');
    setMfaToken(null);
    setMaskedEmail('');
    verifyForm.reset();
  }

  function handleResend () {
    resendMutation.mutate({ token: mfaToken });
  }

  useEffect(() => {
    if (authContext.user && loginMutation.isIdle) {
      navigate(from, { replace: true });
    }
  }, [authContext.user, loginMutation.isIdle, from, navigate]);

  return (
    <>
      <Head>
        <title>{step === 'verify' ? 'Enter verification code' : 'Login'}</title>
      </Head>
      {step === 'credentials' && (
        <form onSubmit={form.onSubmit(loginMutation.mutateAsync)}>
          <Fieldset disabled={loginMutation.isPending} variant='unstyled'>
            <Container>
              <Stack align='stretch'>
                <Stack align='center'>
                  <Stack
                    justify='center'
                    w='134px'
                    h='134px'
                    bdrs='50%'
                    bg='gray.3'
                  >
                    <Title align='center' order={3} fw='bold'>{facility?.name}</Title>
                  </Stack>
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
                  <Button
                    type='submit'
                    loading={loginMutation.isPending}
                    fullWidth
                  >
                    Login
                  </Button>
                  <Link to='/passwords/forgot'>
                    <Text size='lg'>Forgot password</Text>
                  </Link>
                </Stack>
              </Stack>
            </Container>
          </Fieldset>
        </form>
      )}
      {step === 'verify' && (
        <Container>
          <Stack>
            <IconButtonLink icon={IconArrowLeft} onClick={handleBackToLogin} />

            <div>
              <Text c='dimmed' size='sm'>Check your email</Text>
              <Title order={2}>We sent a 6-digit code to {maskedEmail}.</Title>
            </div>

            <form onSubmit={verifyForm.onSubmit(() => verifyMutation.mutateAsync({ token: mfaToken, code: verifyForm.getValues().code }))}>
              <Fieldset disabled={verifyMutation.isPending} variant='unstyled'>
                <Stack align='flex-start'>
                  <Text fw={700}>Verification code</Text>
                  <PinInput
                    length={6}
                    type='number'
                    oneTimeCode
                    autoFocus
                    {...verifyForm.getInputProps('code')}
                    error={!!verifyForm.errors.code}
                  />
                  {verifyForm.errors.code && (
                    <Text size='sm' c='red'>{verifyForm.errors.code}</Text>
                  )}

                  <Button
                    variant={resendCooldown > 0 ? 'default' : 'secondary'}
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendMutation.isPending}
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${String(Math.floor(resendCooldown / 60)).padStart(2, '0')}:${String(resendCooldown % 60).padStart(2, '0')}`
                      : 'Resend code'}
                  </Button>

                  <Button
                    type='submit'
                    loading={verifyMutation.isPending}
                    disabled={verifyForm.getValues().code.length !== 6}
                  >
                    Verify and continue
                  </Button>
                </Stack>
              </Fieldset>
            </form>
          </Stack>
        </Container>
      )}
    </>
  );
}

export default Login;
