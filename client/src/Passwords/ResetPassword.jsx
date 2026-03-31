import { useNavigate, useParams, Link } from 'react-router';
import { Button, Container, Fieldset, Stack, Text, Title } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { StatusCodes } from 'http-status-codes';

import Api from '@/Api';
import PasswordInput from '@/components/PasswordInput';
import { useFacilityContext } from '@/FacilityContext';
import { useToast } from '@/components/ToastContext';

function ResetPassword () {
  const navigate = useNavigate();
  const { facility } = useFacilityContext();
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
              {error?.response?.status === StatusCodes.GONE && (
                <Stack align='center'>
                  <Stack justify='center' align='center' w='134px' h='134px' bdrs='50%' bg='gray.3'>
                    <Title align='center' order={3} fw='bold'>{facility?.name}</Title>
                  </Stack>
                  <div>
                    <Text c='dimmed' size='lg' ta='center'>Reset link expired</Text>
                    <Title order={3} ta='center'>This password reset link is no longer valid. Request a new one to continue.</Title>
                  </div>
                  <Stack align='center' gap='sm' mt='3rem'>
                    <Button variant='secondary' component={Link} to='/login'>Back to sign in</Button>
                    <Button component={Link} to='/passwords/forgot'>Request new link</Button>
                  </Stack>
                </Stack>
              )}
              {error?.response?.status === StatusCodes.NOT_FOUND && (
                <Stack align='center'>
                  <Stack justify='center' align='center' w='134px' h='134px' bdrs='50%' bg='gray.3'>
                    <Title align='center' order={3} fw='bold'>{facility?.name}</Title>
                  </Stack>
                  <div>
                    <Text c='dimmed' size='lg' ta='center'>Reset link invalid</Text>
                    <Title order={3} ta='center'>The password reset link is not valid. Request a new one to continue.</Title>
                  </div>
                  <Stack align='center' gap='sm' mt='3rem'>
                    <Button variant='secondary' component={Link} to='/login'>Back to sign in</Button>
                    <Button component={Link} to='/passwords/forgot'>Request new link</Button>
                  </Stack>
                </Stack>
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
