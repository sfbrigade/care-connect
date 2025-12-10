import { useNavigate, Link } from 'react-router';
import { Alert, Box, Button, Container, Fieldset, Group, Stack, TextInput, Title } from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '../../core/Api';

function ForgotPassword () {
  const navigate = useNavigate();

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
    onSuccess: () => navigate('/login', { state: { flash: 'Please check your email in a few minutes for a reset password link.' } }),
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  return (
    <>
      <Head>
        <title>Forgot your password?</title>
      </Head>
      <Container>
        <Title mb='md'>Forgot your password?</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
            <Stack w={{ base: '100%', xs: 320 }}>
              {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
              <Box>Enter the email address you registered to receive a reset password link.</Box>
              <TextInput
                {...form.getInputProps('email')}
                key='email'
                label='Email'
                type='email'
              />
              <Group>
                <Button type='submit'>Submit</Button>
              </Group>
              <Box>
                <Link to='/login'>Back to login...</Link>
              </Box>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default ForgotPassword;
