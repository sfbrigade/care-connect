import { useState } from 'react';
import { useParams } from 'react-router';
import { Alert, Button, Code, Container, Divider, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { StatusCodes } from 'http-status-codes';
import { IconArrowLeft } from '@tabler/icons-react';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';

function AdminUserSupportPage () {
  const { userId } = useParams();
  const { showToast } = useToast();
  const [mfaCode, setMfaCode] = useState(null);
  const [passwordValues, setPasswordValues] = useState({
    password: '',
    passwordConfirmation: '',
  });

  const passwordForm = useForm({
    mode: 'uncontrolled',
    initialValues: {
      password: '',
      passwordConfirmation: '',
    },
    validate: {
      password: hasLength({ min: 12 }, 'Passwords must be at least 12 characters.'),
      passwordConfirmation: (value, values) => value === values.password ? null : 'Passwords do not match.',
    },
  });

  const { data: user } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => Api.users.get(userId).then(response => response.data),
  });

  const setPasswordMutation = useMutation({
    mutationFn: (values) => Api.users.setPassword(userId, values.password),
    onSuccess: () => {
      passwordForm.reset();
      setPasswordValues({
        password: '',
        passwordConfirmation: '',
      });
      showToast('The user\'s password has been updated', 'success');
    },
    onError: (errors) => passwordForm.setErrors(errors),
  });

  const getMfaCodeMutation = useMutation({
    mutationFn: () => Api.users.getMfaCode(userId),
    onSuccess: (response) => {
      if (response.status === StatusCodes.NO_CONTENT) {
        setMfaCode(null);
        showToast('No active MFA code found for this user', 'info');
        return;
      }
      setMfaCode(response.data);
    },
    onError: () => {
      setMfaCode(null);
      showToast('Unable to load MFA code', 'error');
    },
  });

  const passwordInputProps = passwordForm.getInputProps('password');
  const passwordConfirmationInputProps = passwordForm.getInputProps('passwordConfirmation');
  const canSetPassword = !!passwordValues.password &&
    !!passwordValues.passwordConfirmation &&
    passwordValues.password === passwordValues.passwordConfirmation;
  const passwordConfirmationError = passwordValues.passwordConfirmation &&
    !passwordValues.password.startsWith(passwordValues.passwordConfirmation)
    ? 'Passwords do not match.'
    : null;

  return (
    <>
      <Head>
        <title>Login Support</title>
      </Head>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to='/admin/users' aria-label='Go back' />
      </Header>
      <Container>
        <Stack>
          <Title>Login support</Title>
          {user && (
            <Text c='dimmed'>
              {user.firstName} {user.lastName} &lt;{user.email}&gt;
            </Text>
          )}
          <Divider />
          <form onSubmit={passwordForm.onSubmit(setPasswordMutation.mutateAsync)}>
            <Stack>
              <Title order={3}>Password support</Title>
              {passwordForm.errors?._form && <Alert color='red'>{passwordForm.errors._form}</Alert>}
              <TextInput
                {...passwordInputProps}
                key={passwordForm.key('password')}
                label='New password'
                type='password'
                autoComplete='new-password'
                disabled={setPasswordMutation.isPending}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  passwordInputProps.onChange?.(event);
                  setPasswordValues((current) => ({
                    ...current,
                    password: value,
                  }));
                }}
              />
              <TextInput
                {...passwordConfirmationInputProps}
                key={passwordForm.key('passwordConfirmation')}
                label='Confirm new password'
                type='password'
                autoComplete='new-password'
                disabled={setPasswordMutation.isPending}
                error={passwordConfirmationError}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  passwordConfirmationInputProps.onChange?.(event);
                  setPasswordValues((current) => ({
                    ...current,
                    passwordConfirmation: value,
                  }));
                }}
              />
              <Group>
                <Button disabled={!canSetPassword} loading={setPasswordMutation.isPending} type='submit'>Set password</Button>
              </Group>
            </Stack>
          </form>
          <Divider />
          <Stack>
            <Title order={3}>MFA support</Title>
            <Group>
              <Button
                loading={getMfaCodeMutation.isPending}
                onClick={() => getMfaCodeMutation.mutate()}
                type='button'
              >
                Show active MFA code
              </Button>
            </Group>
            {mfaCode && (
              <Stack gap='xs'>
                <Text size='sm'>Active code: <Code>{mfaCode.code}</Code></Text>
                <Text size='sm' c='dimmed'>Expires at {new Date(mfaCode.expiresAt).toLocaleString()}</Text>
                <Text size='sm' c='dimmed'>Attempts remaining: {mfaCode.attemptsRemaining}</Text>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Container>
    </>
  );
}

export default AdminUserSupportPage;
