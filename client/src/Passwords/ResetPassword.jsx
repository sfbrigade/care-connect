import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { Anchor, Alert, Button, Container, Fieldset, Group, Stack, Text, Title } from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { IconCheck } from '@tabler/icons-react';
import { StatusCodes } from 'http-status-codes';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import PasswordInput from '@/components/PasswordInput';
import PasswordStrength from '@/components/PasswordStrength';

function ResetPassword () {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { token } = useParams();

  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: {
      password: '',
    },
    validate: {
      password: hasLength({ min: 12 }, 'Passwords must be at least 12 characters.'),
    },
  });

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.passwords.update(token, values.password),
    onSuccess: async (response) => {
      queryClient.setQueryData(['users', 'me'], response.data);
      setSuccess(true);
      setTimeout(() => {
        if (response.data.organizationId === 'sfpd' || response.data.organizationId === 'sfso') {
          navigate('/units', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 3000);
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  function onContinue () {
    if (user?.organizationId === 'sfpd' || user?.organizationId === 'sfso') {
      navigate('/units', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }

  const { error, isLoading } = useQuery({
    queryKey: ['passwords', token],
    queryFn: () => Api.passwords.get(token),
    enabled: !!token,
    retry: false,
  });

  return (
    <>
      <Head>
        <title>Reset password</title>
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
                  {!success && (
                    <>
                      <Title order={2}>Reset password</Title>
                      <PasswordInput
                        {...form.getInputProps('password')}
                        key='password'
                        placeholder='Enter new password'
                      />
                      <PasswordStrength password={form.getValues().password} />
                      <Button fullWidth type='submit'>
                        Reset password
                      </Button>
                      <Text align='center'>Or <Anchor component={Link} to='/login'>Log in</Anchor></Text>
                    </>
                  )}
                  {success && (
                    <Stack align='center' mt='xl'>
                      <Group align='center' justify='center' w={56} h={56} bdrs='50%' bd='3px solid var(--mantine-color-teal-6)'>
                        <IconCheck color='var(--mantine-color-teal-6)' size={32} />
                      </Group>
                      <Stack gap='xs'>
                        <Title align='center' order={3}>Password updated</Title>
                        <Text align='center' c='dimmed'>
                          You will be automatically logged into your account in a few seconds. If not, press Continue.
                        </Text>
                      </Stack>
                      <Button fullWidth onClick={onContinue}>Continue</Button>
                    </Stack>
                  )}
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
