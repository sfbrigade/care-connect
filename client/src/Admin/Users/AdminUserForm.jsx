import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Alert, Button, Checkbox, Container, Fieldset, Group, Select, Stack, TextInput, Title } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { IconArrowLeft } from '@tabler/icons-react';

import { isEmail } from '@/utils/email';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';

function AdminUserForm () {
  const { user } = useAuthContext();
  const location = useLocation();
  const queryClient = useQueryClient();
  const params = useParams();
  const userId = params.userId ?? user?.id;
  const isEditingSelf = userId === user?.id;
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [organizationId, setOrganizationId] = useState('');

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      picture: '',
      pictureUrl: '',
      isAdmin: false,
      isOrgAdmin: false,
      isFacilityAdmin: false,
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
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => Api.users.get(userId).then(response => response.data),
  });

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => Api.organizations.index().then(response => response.data),
  });

  const { data: titles } = useQuery({
    queryKey: ['organizations', organizationId, 'titles'],
    queryFn: () => Api.organizations.titles.index(organizationId).then(response => response.data),
    enabled: !!organizationId,
  });

  const { data: units } = useQuery({
    queryKey: ['organizations', organizationId, 'units'],
    queryFn: () => Api.organizations.units.index(organizationId, 1, 1000).then(response => response.data),
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (data) {
      form.initialize({
        ...data,
        isOrgAdmin: data.roles?.includes('ORG_ADMIN') ?? false,
        isFacilityAdmin: data.roles?.includes('FACILITY_ADMIN') ?? false,
      });
      setOrganizationId(data.organizationId || '');
    }
  }, [data]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => {
      const { isOrgAdmin: nextIsOrgAdmin, isFacilityAdmin: nextIsFacilityAdmin, ...rest } = values;
      const payload = { ...rest };
      if (user?.isAdmin && !isEditingSelf) {
        const preservedRoles = (data?.roles ?? []).filter(
          r => r !== 'ORG_ADMIN' && r !== 'FACILITY_ADMIN'
        );
        payload.roles = [
          ...preservedRoles,
          ...(nextIsOrgAdmin ? ['ORG_ADMIN'] : []),
          ...(nextIsFacilityAdmin ? ['FACILITY_ADMIN'] : []),
        ];
      }
      return Api.users.update(userId, payload);
    },
    onSuccess: (response) => {
      showToast('The user\'s profile has been updated', 'success');
      queryClient.setQueryData(['users', userId], response.data);
      if (userId === user?.id) {
        queryClient.setQueryData(['users', 'me'], (old) => ({ ...(old ?? {}), ...response.data }));
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
      <Header>
        <IconButtonLink icon={IconArrowLeft} to='/admin/users' aria-label='Go back' />
      </Header>
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
              />
              <TextInput
                {...form.getInputProps('lastName')}
                key={form.key('lastName')}
                label='Last name'
              />
              <TextInput
                {...form.getInputProps('email')}
                key={form.key('email')}
                label='Email'
                type='email'
              />
              <Select
                {...form.getInputProps('organizationId')}
                key={form.key('organizationId')}
                label='Organization'
                data={[{ value: '', label: 'None' }, ...(organizations?.map((o) => ({ value: o.id, label: o.name })) || [])]}
                value={organizationId}
                onChange={(value) => {
                  const nextOrganizationId = value || '';
                  form.setFieldValue('organizationId', nextOrganizationId);
                  form.setFieldValue('titleId', '');
                  form.setFieldValue('unitId', '');
                  setOrganizationId(nextOrganizationId);
                }}
              />
              {(organizationId === 'sfpd' || organizationId === 'sfso') && (
                <TextInput
                  {...form.getInputProps('badgeNumber')}
                  key={form.key('badgeNumber')}
                  label='Star Number'
                  placeholder='Enter badge or star number'
                />
              )}
              {organizationId === 'sfso' && (
                <Select
                  {...form.getInputProps('titleId')}
                  key='titleId'
                  label='Rank'
                  data={titles?.map((title) => ({ value: title.id, label: title.name })) || []}
                />
              )}
              {organizationId === 'sfso' && (
                <Checkbox
                  {...form.getInputProps('prop115Certified', { type: 'checkbox' })}
                  key={form.key('prop115Certified')}
                  label='Prop 115 certified'
                />
              )}
              {(organizationId === 'sfpd' || organizationId === 'sfso') && (
                <Select
                  {...form.getInputProps('unitId')}
                  key={form.key('unitId')}
                  label='Unit'
                  data={units?.map((unit) => ({ value: unit.id, label: unit.name })) || []}
                />
              )}
              {user?.isAdmin && (
                <Stack gap='sm'>
                  <Checkbox
                    {...form.getInputProps('isAdmin', { type: 'checkbox' })}
                    key={form.key('isAdmin')}
                    label='Super Admin'
                    description='Grants full platform-wide access.'
                    disabled={isEditingSelf}
                    onClick={(event) => {
                      const action = event.currentTarget.checked ? 'grant' : 'revoke';
                      if (!window.confirm(`Are you sure you want to ${action} super admin access for this user?`)) {
                        event.preventDefault();
                      }
                    }}
                  />
                  <Checkbox
                    {...form.getInputProps('isOrgAdmin', { type: 'checkbox' })}
                    key={form.key('isOrgAdmin')}
                    label='Org Admin'
                    description='Can manage users within their organization.'
                    disabled={isEditingSelf}
                  />
                  <Checkbox
                    {...form.getInputProps('isFacilityAdmin', { type: 'checkbox' })}
                    key={form.key('isFacilityAdmin')}
                    label='Facility Admin'
                    description='Can manage capacity at the facility.'
                    disabled={isEditingSelf}
                  />
                </Stack>
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
