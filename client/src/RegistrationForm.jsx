import { useState } from 'react';
import { Alert, Anchor, Button, Fieldset, Stack, Text, TextInput } from '@mantine/core';
import { isNotEmpty, hasLength, useForm } from '@mantine/form';

import { isEmail } from '@/utils/email';
import { Link } from 'react-router';
import { IconMail, IconLock } from '@tabler/icons-react';

import PasswordInput from '@/components/PasswordInput';
import PasswordStrength from '@/components/PasswordStrength';

function RegistrationForm ({ invite, onSubmitMutation }) {
  const [passwordValue, setPasswordValue] = useState('');
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: invite
      ? {
          firstName: invite.firstName,
          lastName: invite.lastName,
          email: invite.email,
          password: '',
        }
      : {
          firstName: '',
          lastName: '',
          email: '',
          password: '',
        },
    validate: {
      firstName: isNotEmpty('First name is required.'),
      lastName: isNotEmpty('Last name is required.'),
      email: isEmail('Please enter a valid email address.'),
      password: hasLength({ min: 12 }, 'Passwords must be at least 12 characters.'),
    },
  });

  function onSubmit (values) {
    onSubmitMutation.mutateAsync(values, {
      onError: (errors) => form.setErrors(errors),
      onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    });
  }

  const passwordInputProps = form.getInputProps('password');

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
        <Stack>
          {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
          {!!invite && (
            <>
              <input type='hidden' {...form.getInputProps('firstName')} key={form.key('firstName')} />
              <input type='hidden' {...form.getInputProps('lastName')} key={form.key('lastName')} />
            </>
          )}
          {!invite && (
            <>
              <TextInput
                {...form.getInputProps('firstName')}
                key={form.key('firstName')}
                label='First name'
                placeholder='Enter first name'
              />
              <TextInput
                {...form.getInputProps('lastName')}
                key={form.key('lastName')}
                label='Last name'
                placeholder='Enter last name'
              />
            </>
          )}
          <TextInput
            {...form.getInputProps('email')}
            key={form.key('email')}
            type='email'
            label='Email'
            placeholder='youremail@example.com'
            disabled={!!invite}
            leftSection={<IconMail size={20} color='var(--mantine-color-dark-1)' />}
          />
          <PasswordInput
            {...passwordInputProps}
            onChange={(event) => {
              passwordInputProps.onChange?.(event);
              setPasswordValue(event.currentTarget.value);
            }}
            key={form.key('password')}
            label='Password'
            placeholder='Enter password'
            leftSection={<IconLock size={20} color='var(--mantine-color-dark-1)' />}
          />
          <PasswordStrength password={passwordValue} />
          <Button fullWidth type='submit'>Create account</Button>
          <Text align='center' size='lg'>Or <Anchor component={Link} to='/login'>Login</Anchor></Text>
        </Stack>
      </Fieldset>
    </form>
  );
}

export default RegistrationForm;
