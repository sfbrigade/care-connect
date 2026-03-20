import { useNavigate } from 'react-router';
import { Alert, Button, Checkbox, Container, Fieldset, Group, Stack, Select, Textarea, TextInput, Title } from '@mantine/core';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminInviteForm () {
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      message: '',
      organizationId: '',
      titleId: '',
      badgeNumber: '',
      prop115Certified: false
    },
    validate: {
      firstName: isNotEmpty('First name is required.'),
      lastName: isNotEmpty('Last name is required.'),
      email: isEmail('Please enter a valid email address.'),
    },
  });

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => Api.organizations.index().then(response => response.data),
  });

  const { data: titles } = useQuery({
    queryKey: ['organizations', form.getValues().organizationId, 'titles'],
    queryFn: () => Api.organizations.titles.index(form.getValues().organizationId).then(response => response.data),
    enabled: !!form.getValues().organizationId,
  });

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.invites.create(values),
    onSuccess: () => navigate('/admin/invites', { flash: 'Invite sent!' }),
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  return (
    <>
      <Head>
        <title>Invite a new User</title>
      </Head>
      <Container>
        <Title mb='md'>Invite a new User</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset variant='unstyled' disabled={onSubmitMutation.isPending}>
            <Stack>
              {form.errors._form && <Alert color='red'>{form.errors._form}</Alert>}
              <TextInput
                {...form.getInputProps('firstName')}
                key='firstName'
                label='First name'
                required
                withAsterisk={false}
              />
              <TextInput
                {...form.getInputProps('lastName')}
                key='lastName'
                label='Last name'
                required
                withAsterisk={false}
              />
              <TextInput
                {...form.getInputProps('email')}
                key='email'
                label='Email'
                required
                withAsterisk={false}
                type='email'
              />
              <Select
                {...form.getInputProps('organizationId')}
                key='organizationId'
                label='Organization'
                data={[{ value: '', label: 'None' }, ...(organizations?.map((o) => ({ value: o.id, label: o.name })) || [])]}
              />
              {!!titles?.length && (
                <Select
                  {...form.getInputProps('titleId')}
                  key='titleId'
                  label='Rank'
                  data={titles?.map((title) => ({ value: title.id, label: title.name })) || []}
                />
              )}
              {(form.getValues().organizationId === 'sfpd' || form.getValues().organizationId === 'sfso') && (
                <TextInput
                  {...form.getInputProps('badgeNumber')}
                  key='badgeNumber'
                  label='Star number'
                />
              )}
              {form.getValues().organizationId === 'sfso' && (
                <Checkbox
                  {...form.getInputProps('prop115Certified')}
                  key='prop115Certified'
                  label='Prop 115 certified'
                />
              )}
              <Textarea
                {...form.getInputProps('message')}
                key='message'
                label='Message'
              />
              <Group>
                <Button type='submit'>
                  Submit
                </Button>
              </Group>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default AdminInviteForm;
