import { useState } from 'react';
import { Link } from 'react-router';
import { Anchor, Alert, Box, Button, Container, Fieldset, Group, Stack, TextInput, Text, Title } from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import { IconArrowLeft, IconBrandTelegram } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function ForgotPassword () {
  const [success, setSuccess] = useState(false);

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
    onSuccess: () => setSuccess(true),
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  return (
    <>
      <Head>
        <title>Forgot your password?</title>
      </Head>
      <Container size='xs'>
        {!success && (
          <>
            <Box mb='xl'>
              <Button color='gray.3' c='black' w={44} p={0} h={44} component={Link} to='/login'>
                <IconArrowLeft size={20} />
              </Button>
            </Box>
            <Title order={2} mb='md'>Forgot your password?</Title>
            <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
              <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
                <Stack>
                  {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
                  <Text c='dimmed'>Enter the email address you registered to receive a reset password link.</Text>
                  <TextInput
                    {...form.getInputProps('email')}
                    key='email'
                    placeholder='youremail@example.com'
                    type='email'
                  />
                  <Group>
                    <Button fullWidth type='submit'>Send reset link</Button>
                  </Group>
                </Stack>
              </Fieldset>
            </form>
          </>
        )}
        {success && (
          <Stack align='center' mt='xl'>
            <Group align='center' justify='center' w={56} h={56} bdrs='50%' bd='3px solid var(--mantine-color-indigo-6)'>
              <IconBrandTelegram color='var(--mantine-color-indigo-6' size={32} />
            </Group>
            <Stack gap='xs'>
              <Title align='center' order={3}>We've sent an email to {form.getValues().email}</Title>
              <Text align='center' c='dimmed'>
                Click on the link within 10 minutes, before it expires. If you didn't receive the link, check your junk or spam folder or <Anchor onClick={() => setSuccess(false)}>resend the link</Anchor>.
              </Text>
            </Stack>
            <Button fullWidth component={Link} to='/login'>Return to Log in</Button>
          </Stack>
        )}
      </Container>
    </>
  );
}

export default ForgotPassword;
