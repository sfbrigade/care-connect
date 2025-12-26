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
        <Stack>
          {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
          <TextInput
            {...form.getInputProps('firstName')}
            key={form.key('firstName')}
            label='First name'
            placeholder='Enter first name'
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
            placeholder='Enter last name'
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
            placeholder='youremail@example.com'
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
            placeholder='Enter password'
            styles={{
              input: {
                fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
              },
            }}
          />
          <Group>
            <Button fullWidth type='submit'>Create account</Button>
          </Group>
        </Stack>
      </Fieldset>
    </form>
  );
}

export default RegistrationForm;
