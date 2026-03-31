import { Alert, Button, Group, Modal, Stack, TextInput, Title } from '@mantine/core';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';

import Api from '@/Api';

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
    <Modal opened={opened} onClose={handleClose} size='sm' centered withCloseButton={false}>
      <Stack gap='md'>
        <div>
          <Title order={5} c='dimmed'>Invite user</Title>
          <Title order={3}>Invite a new user.</Title>
        </div>
        <form onSubmit={form.onSubmit(mutation.mutateAsync)}>
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
            <Group>
              <Button variant='subtle' c='red' onClick={handleClose}>
                Cancel
              </Button>
              <Button type='submit' loading={mutation.isPending}>
                Send invite
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
}

export default InviteUserModal;
