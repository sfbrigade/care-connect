import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Alert, Button, Checkbox, Container, Fieldset, Group, Select, Stack, TextInput, Title } from '@mantine/core';
import { hasLength, isEmail, isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import { useToast } from '@/components/ToastContext';

function AdminUserForm () {
  const { user } = useAuthContext();
  const location = useLocation();
  const queryClient = useQueryClient();
  const params = useParams();
  const userId = params.userId ?? user?.id;
  const { showToast } = useToast();
  const navigate = useNavigate();

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      picture: '',
      pictureUrl: '',
      isAdmin: false,
      organizationId: '',
      badgeNumber: '',
      titleId: '',
      unitId: '',
      prop115Certified: false,
    },
    validate: {
      firstName: isNotEmpty('First name is required.'),
      lastName: isNotEmpty('Last name is required.'),
      email: isEmail('Please enter a valid email address.'),
      password: (value) => value ? hasLength({ min: 12 }, 'Passwords must be at least 12 characters.') : null,
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => Api.users.get(userId).then(response => response.data),
  });

  const { data: organization } = useQuery({
    queryKey: ['organization', form.getValues().organizationId],
    queryFn: () => Api.organizations.get(form.getValues().organizationId).then(response => response.data),
    enabled: !!form.getValues().organizationId,
  });

  const { data: titles } = useQuery({
    queryKey: ['organizations', form.getValues().organizationId, 'titles'],
    queryFn: () => Api.organizations.titles.index(form.getValues().organizationId).then(response => response.data),
    enabled: !!form.getValues().organizationId,
  });

  const { data: units } = useQuery({
    queryKey: ['organizations', form.getValues().organizationId, 'units'],
    queryFn: () => Api.organizations.units.index(form.getValues().organizationId, 1, 1000).then(response => response.data),
    enabled: !!form.getValues().organizationId,
  });

  useEffect(() => {
    if (data) {
      form.initialize({
        ...data,
        password: '',
      });
    }
  }, [data]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.users.update(userId, values),
    onSuccess: (response) => {
      showToast('The user\'s profile has been updated', 'success');
      queryClient.setQueryData(['users', userId], response.data);
      if (userId === user?.id) {
        queryClient.setQueryData(['users', 'me'], response.data);
      }
      navigate('/admin/users');
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  return (
    <>
      <Head>
        <title>Edit Profile</title>
      </Head>
      <Container>
        <Title mb='md'>Edit Profile</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading} variant='unstyled'>
            <Stack>
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}
              <TextInput
                {...form.getInputProps('firstName')}
                key={form.key('firstName')}
                label='First name'
                disabled
              />
              <TextInput
                {...form.getInputProps('lastName')}
                key={form.key('lastName')}
                label='Last name'
                disabled
              />
              <TextInput
                {...form.getInputProps('email')}
                key={form.key('email')}
                label='Email'
                type='email'
                disabled
              />
              {!!organization && (
                <Select
                  {...form.getInputProps('organizationId')}
                  key='organizationId'
                  label='Organization'
                  data={[{ value: organization.id, label: organization.name }]}
                  disabled
                />
              )}
              {(form.getValues().organizationId === 'sfpd' || form.getValues().organizationId === 'sfso') && (
                <TextInput
                  {...form.getInputProps('badgeNumber')}
                  key={form.key('badgeNumber')}
                  label='Star Number'
                  placeholder='Enter badge or star number'
                />
              )}
              {form.getValues().organizationId === 'sfso' && (
                <Select
                  {...form.getInputProps('titleId')}
                  key='titleId'
                  label='Rank'
                  data={titles?.map((title) => ({ value: title.id, label: title.name })) || []}
                />
              )}
              {form.getValues().organizationId === 'sfso' && (
                <Checkbox
                  {...form.getInputProps('prop115Certified', { type: 'checkbox' })}
                  key={form.key('prop115Certified')}
                  label='Prop 115 certified'
                />
              )}
              {(form.getValues().organizationId === 'sfpd' || form.getValues().organizationId === 'sfso') && (
                <Select
                  {...form.getInputProps('unitId')}
                  key={form.key('unitId')}
                  label='Unit'
                  data={units?.map((unit) => ({ value: unit.id, label: unit.name })) || []}
                />
              )}
              <TextInput
                {...form.getInputProps('password')}
                key={form.key('password')}
                label='Password'
                type='password'
                autoComplete='new-password'
              />
              {user?.isAdmin && (
                <Checkbox
                  {...form.getInputProps('isAdmin', { type: 'checkbox' })}
                  key={form.key('isAdmin')}
                  label='Is an Administrator?'
                />
              )}
              <Group>
                <Button disabled={onSubmitMutation.isPending} type='submit'>Submit</Button>
              </Group>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default AdminUserForm;
