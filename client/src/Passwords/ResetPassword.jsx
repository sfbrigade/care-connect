import { useNavigate, useParams, Link } from 'react-router';
import { Alert, Button, Container, Fieldset, Stack, Text, Title } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { StatusCodes } from 'http-status-codes';

import Api from '@/Api';
import PasswordInput from '@/components/PasswordInput';
import { useToast } from '@/components/ToastContext';

function ResetPassword () {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { token } = useParams();

  const form = useForm({
    mode: 'controlled',
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: hasLength({ min: 12 }, 'Your password is too weak. Use at least 12 characters.'),
      confirmPassword: (value, values) => {
        if (value !== values.password) return 'Passwords do not match.';
        return null;
      },
    },
  });

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.passwords.update(token, values.password),
    onSuccess: () => {
      showToast('Password updated', 'success', 4000, 'Please sign in again.');
      navigate('/login', { replace: true });
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  const { error, isLoading } = useQuery({
    queryKey: ['passwords', token],
    queryFn: () => Api.passwords.get(token),
    enabled: !!token,
    retry: false,
  });

  return (
    <>
      <Head>
        <title>Create a new password</title>
      </Head>
      <Container>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
            <Stack>
              {error?.response?.status === StatusCodes.NOT_FOUND && (
                <Alert color='red'>
                  Sorry, this password reset link is invalid.<br />
                  <Link to='/passwords/forgot'>Request another?</Link>
                </Alert>
              )}
              {error?.response?.status === StatusCodes.GONE && (
                <Alert color='red'>
                  Sorry, this password reset link has expired.<br />
                  <Link to='/passwords/forgot'>Request another?</Link>
                </Alert>
              )}
              {!isLoading && !error && (
                <>
                  <div>
                    <Text c='dimmed' size='lg'>Create a new password</Text>
                    <Title order={3}>Use at least 12 characters. A passphrase with 3–5 unrelated words is easier to remember and more secure.</Title>
                  </div>

                  <PasswordInput
                    {...form.getInputProps('password')}
                    label='New password'
                    placeholder='Enter new password'
                  />

                  <PasswordInput
                    {...form.getInputProps('confirmPassword')}
                    label='Confirm new password'
                    placeholder='Confirm new password'
                  />

                  <Stack align='flex-start' gap='sm'>
                    <Button component={Link} to='/login' variant='secondary'>Back to sign in</Button>
                    <Button type='submit' loading={onSubmitMutation.isPending}>Reset password</Button>
                  </Stack>
                </>
              )}
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default ResetPassword;
