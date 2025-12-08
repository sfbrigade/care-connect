import { Alert, Button, Fieldset, Group, Stack, TextInput } from '@mantine/core';
import { isEmail, isNotEmpty, hasLength, useForm } from '@mantine/form';

function RegistrationForm ({ onSubmitMutation }) {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
    validate: {
      firstName: isNotEmpty('First name is required.'),
      lastName: isNotEmpty('Last name is required.'),
      email: isEmail('Please enter a valid email address.'),
      password: hasLength({ min: 8 }, 'Passwords must be at least 8 characters.'),
    },
  });

  function onSubmit (values) {
    onSubmitMutation.mutateAsync(values, {
      onError: (errors) => form.setErrors(errors),
      onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    });
  }

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
        <Stack w={{ base: '100%', xs: 320 }}>
          {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
          <TextInput
            {...form.getInputProps('firstName')}
            key={form.key('firstName')}
            label='First name'
            styles={{
              input: {
                fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
              },
            }}
          />
          <TextInput
            {...form.getInputProps('lastName')}
            key={form.key('lastName')}
            label='Last name'
            styles={{
              input: {
                fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
              },
            }}
          />
          <TextInput
            {...form.getInputProps('email')}
            key={form.key('email')}
            type='email'
            label='Email'
            styles={{
              input: {
                fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
              },
            }}
          />
          <TextInput
            {...form.getInputProps('password')}
            key={form.key('password')}
            type='password'
            label='Password'
            styles={{
              input: {
                fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
              },
            }}
          />
          <Group>
            <Button type='submit'>Submit</Button>
          </Group>
        </Stack>
      </Fieldset>
    </form>
  );
}

export default RegistrationForm;
