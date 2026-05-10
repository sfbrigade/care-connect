import { Alert, Button, Select, Stack, TextInput } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';

import { isEmail } from '@/utils/email';
import { useMutation, useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import FullScreenModal from './FullScreenModal';

function InviteUserModal ({ opened, onClose, organizationId, onSuccess, onError }) {
  const requiresBadgeNumber = organizationId === 'sfpd' || organizationId === 'sfso';
  const requiresRank = organizationId === 'sfso';
  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      badgeNumber: '',
      titleId: '',
    },
    validate: {
      firstName: isNotEmpty('First name is required.'),
      lastName: isNotEmpty('Last name is required.'),
      email: isEmail('Please enter a valid email address.'),
      badgeNumber: (value) => {
        if (!requiresBadgeNumber) return null;
        if (!value) return 'Star number is required.';
        return value.length > 4 ? 'Star number must be 4 characters or fewer.' : null;
      },
      titleId: requiresRank ? isNotEmpty('Rank is required.') : undefined,
    },
  });

  const { data: titles } = useQuery({
    queryKey: ['organizations', organizationId, 'titles'],
    queryFn: () => Api.organizations.titles.index(organizationId).then(response => response.data),
    enabled: requiresRank,
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
      if (error.email || error.firstName || error.lastName || error.badgeNumber || error.titleId) {
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
      title='Invite a new user. You can only invite users from your own organization.'
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
          {requiresBadgeNumber && (
            <TextInput
              {...form.getInputProps('badgeNumber')}
              label='Star number'
              maxLength={4}
              inputMode='numeric'
              onKeyDown={(event) => {
                if (!/[0-9]/.test(event.key) && event.key !== 'Backspace') {
                  event.preventDefault();
                }
              }}
              required
            />
          )}
          {requiresRank && (
            <Select
              {...form.getInputProps('titleId')}
              label='Rank'
              data={titles?.map((title) => ({ value: title.id, label: title.name })) || []}
              required
            />
          )}
        </Stack>
      </form>
    </FullScreenModal>
  );
}

export default InviteUserModal;
