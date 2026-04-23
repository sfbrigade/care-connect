import { useState } from 'react';
import { Link } from 'react-router';
import { Alert, Button, Container, Fieldset, Group, Stack, TextInput, Text, Title } from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { DateTime } from 'luxon';

import Api from '@/Api';
import IconButtonLink from '@/components/IconButtonLink';
import useNow from '@/hooks/useNow';

function ForgotPassword () {
  const [success, setSuccess] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(null);
  const isCoolingDown = success && resendAvailableAt !== null && new Date() < resendAvailableAt;
  const now = useNow(1000, isCoolingDown);
  const resendCooldown = isCoolingDown ? Math.max(0, Math.ceil(DateTime.fromJSDate(resendAvailableAt).diff(now, 'seconds').seconds)) : 0;

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: isEmail('Please enter a valid email address.'),
    },
  });

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.passwords.reset(values.email),
    onSuccess: () => {
      setSuccess(true);
      setResendAvailableAt(new Date(Date.now() + 30000));
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  function handleResend () {
    onSubmitMutation.mutate({ email: form.getValues().email });
  }

  return (
    <>
      <Head>
        <title>Forgot password</title>
      </Head>
      <Container mt='-4rem'>
        {!success && (
          <Stack>
            <IconButtonLink icon={IconArrowLeft} aria-label='Go back' to='/login' />
            <div>
              <Text c='dimmed' size='lg'>Forgot password</Text>
              <Title order={3}>Enter the email associated with your account. We'll send you a link to reset your password.</Title>
            </div>
            <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
              <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
                <Stack align='flex-start'>
                  {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
                  <TextInput
                    {...form.getInputProps('email')}
                    key='email'
                    label='Email'
                    placeholder='youremail@example.com'
                    type='email'
                    w='100%'
                  />
                  <Group>
                    <Button variant='secondary' component={Link} to='/login'>Back</Button>
                    <Button type='submit' loading={onSubmitMutation.isPending}>Send reset link</Button>
                  </Group>
                </Stack>
              </Fieldset>
            </form>
          </Stack>
        )}
        {success && (
          <Stack>
            <IconButtonLink icon={IconArrowLeft} aria-label='Go back' onClick={() => setSuccess(false)} />
            <div>
              <Text c='dimmed' size='lg'>Check your email</Text>
              <Title order={3}>We sent a password reset link to {form.getValues().email}.</Title>
            </div>
            <Title order={3}>The link will expire in 10 minutes. If you don't see it, check your spam folder or resend the link.</Title>
            <Stack align='flex-start' gap='sm'>
              <Button
                variant={resendCooldown > 0 ? 'default' : 'secondary'}
                onClick={handleResend}
                disabled={resendCooldown > 0 || onSubmitMutation.isPending}
              >
                {resendCooldown > 0
                  ? `Resend link in ${String(Math.floor(resendCooldown / 60)).padStart(2, '0')}:${String(resendCooldown % 60).padStart(2, '0')}`
                  : 'Resend link'}
              </Button>
              <Button component={Link} to='/login'>Return to sign in</Button>
            </Stack>
          </Stack>
        )}
      </Container>
    </>
  );
}

export default ForgotPassword;
