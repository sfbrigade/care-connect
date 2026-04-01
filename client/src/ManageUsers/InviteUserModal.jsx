import { Alert, Button, Stack, TextInput } from '@mantine/core';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';

import Api from '@/Api';
import FullScreenModal from './FullScreenModal';

function InviteUserModal ({ opened, onClose, organizationId, onSuccess, onError }) {
  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
    validate: {
      firstName: isNotEmpty('First name is required.'),
      lastName: isNotEmpty('Last name is required.'),
      email: isEmail('Please enter a valid email address.'),
    },
  });

  const mutation = useMutation({
    mutationFn: (values) => Api.invites.create({
      ...values,
      organizationId,
    }),
    onSuccess: () => {
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      if (error.email || error.firstName || error.lastName) {
        form.setErrors(error);
      } else {
        onError();
      }
    },
  });

  function handleClose () {
    form.reset();
    onClose();
  }

  return (
    <FullScreenModal
      opened={opened}
      onClose={handleClose}
      subtitle='Invite user'
      title='Invite a new user.'
      actions={
        <>
          <Button variant='destructive' onClick={handleClose}>
            Cancel
          </Button>
          <Button type='submit' form='invite-form' loading={mutation.isPending} disabled={!form.isValid()}>
            Send invite
          </Button>
        </>
      }
    >
      <form id='invite-form' onSubmit={form.onSubmit(mutation.mutateAsync)}>
        <Stack gap='md'>
          {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
          <TextInput
            {...form.getInputProps('firstName')}
            label='First name'
            required
          />
          <TextInput
            {...form.getInputProps('lastName')}
            label='Last name'
            required
          />
          <TextInput
            {...form.getInputProps('email')}
            label='Email'
            type='email'
            required
          />
        </Stack>
      </form>
    </FullScreenModal>
  );
}

export default InviteUserModal;
