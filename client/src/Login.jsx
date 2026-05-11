import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router';
import { Alert, Button, Container, Fieldset, Input, PinInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';

import { isEmail } from '@/utils/email';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { IconMail, IconLock, IconArrowLeft } from '@tabler/icons-react';
import { DateTime } from 'luxon';

import Api from '@/Api';
import useNow from '@/hooks/useNow';
import PasswordInput from '@/components/PasswordInput';
import IconButtonLink from '@/components/IconButtonLink';
import { useAuthContext } from '@/AuthContext';
import resetCenterLogo from '@/assets/careconnect-reset-logo.svg';

import { useToast } from '@/components/ToastContext';

function Login () {
  const authContext = useAuthContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const from = location.state?.from || searchParams.get('from') || '/';

  const [step, setStep] = useState('credentials');
  const [mfaToken, setMfaToken] = useState(null);
  const [mfaEmail, setMfaEmail] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState(null);
  const isCoolingDown = step === 'verify' && resendAvailableAt !== null && new Date() < resendAvailableAt;
  const now = useNow(1000, isCoolingDown);
  const resendCooldown = isCoolingDown ? Math.max(0, Math.ceil(DateTime.fromJSDate(resendAvailableAt).diff(now, 'seconds').seconds)) : 0;

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
    queryClient.setQueryData(['users', 'me'], (old) => ({ ...(old ?? {}), ...userData }));
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
        setMfaEmail(response.data.email);
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
      setMfaEmail(response.data.email);
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
    setMfaEmail('');
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
        <form onSubmit={form.onSubmit(loginMutation.mutate)}>
          <Fieldset disabled={loginMutation.isPending} variant='unstyled'>
            <Container>
              <Stack align='stretch'>
                <Stack align='center' gap='2xl'>
                  <img
                    src={resetCenterLogo}
                    alt=''
                    aria-hidden='true'
                    width='47'
                    height='63'
                  />
                  <Stack align='center' gap='xs'>
                    <Title order={3} ta='center'>
                      Sign in to CareConnect
                    </Title>
                    <Text c='dimmed' size='md' lh='md' ta='center'>
                      Supporting the RESET Center
                    </Text>
                  </Stack>
                </Stack>
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
                <Stack align='center' mt='3rem'>
                  <Button
                    type='submit'
                    data-testid='login-submit-btn'
                    loading={loginMutation.isPending}
                  >
                    Continue
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
        <Container mt='-4rem'>
          <Stack>
            <IconButtonLink icon={IconArrowLeft} onClick={handleBackToLogin} />

            <div>
              <Text c='dimmed' size='lg'>Check your email</Text>
              <Text fz={24} lh='32px'>We sent a 6-digit code to {mfaEmail}.</Text>
            </div>

            <form onSubmit={verifyForm.onSubmit(() => verifyMutation.mutate({ token: mfaToken, code: verifyForm.getValues().code }))}>
              <Fieldset disabled={verifyMutation.isPending} variant='unstyled'>
                <Stack align='flex-start'>
                  <Input.Wrapper label='Verification code' error={verifyForm.errors.code} errorProps={{ size: 'lg', lh: 1.5 }}>
                    <PinInput
                      length={6}
                      size='lg'
                      radius='md'
                      type='number'
                      oneTimeCode
                      autoFocus
                      {...verifyForm.getInputProps('code')}
                      error={!!verifyForm.errors.code}
                    />
                  </Input.Wrapper>

                  <Stack mt='md' gap='sm' align='flex-start'>
                    <Button
                      type='submit'
                      loading={verifyMutation.isPending}
                      disabled={verifyForm.getValues().code.length !== 6}
                    >
                      Verify and continue
                    </Button>

                    <Button
                      variant='white'
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || resendMutation.isPending}
                    >
                      {resendCooldown > 0
                        ? `Resend code in ${String(Math.floor(resendCooldown / 60)).padStart(2, '0')}:${String(resendCooldown % 60).padStart(2, '0')}`
                        : 'Resend code'}
                    </Button>
                  </Stack>
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
