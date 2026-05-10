import { useEffect, useMemo, useState } from 'react';
import { Anchor, Autocomplete, Box, Button, Checkbox, Container, Fieldset, Group, Loader, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { Navigate, useNavigate, useParams } from 'react-router';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { formatUnitName } from '@/utils/unit';

function EditManagedUserPage () {
  const { userId, section } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [unitName, setUnitName] = useState('');
  const [unitId, setUnitId] = useState('');

  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      badgeNumber: '',
      organizationId: '',
      titleId: '',
      prop115Certified: false,
    },
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => Api.users.get(userId).then(response => response.data),
  });

  const organizationId = form.values.organizationId;

  const { data: units } = useQuery({
    queryKey: ['organizations', organizationId, 'units'],
    queryFn: () => Api.organizations.units.index(organizationId, 1, 1000).then(response => response.data),
    enabled: !!organizationId,
  });

  const { data: titles } = useQuery({
    queryKey: ['organizations', organizationId, 'titles'],
    queryFn: () => Api.organizations.titles.index(organizationId, 1).then(response => response.data),
    enabled: organizationId === 'sfso',
  });

  useEffect(() => {
    if (!user) return;
    const values = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      badgeNumber: user.badgeNumber || '',
      organizationId: user.organizationId || '',
      titleId: user.titleId || '',
      prop115Certified: !!user.prop115Certified,
    };
    form.setValues(values);
    form.resetDirty(values);
    setUnitName(formatUnitName(user.unit?.name));
    setUnitId(user.unitId || '');
  }, [user]);

  const autocompleteData = units?.map((unit) => ({
    value: formatUnitName(unit.name),
    label: formatUnitName(unit.name),
  })) || [];

  function handleUnitChange (value) {
    const nextUnitName = formatUnitName(value);
    setUnitName(nextUnitName);
    const normalizedValue = nextUnitName.toLowerCase();
    const selectedUnit = units?.find((unit) => formatUnitName(unit.name).toLowerCase() === normalizedValue);
    setUnitId(selectedUnit?.id || '');
  }

  const payload = useMemo(() => {
    if (section === 'personal') {
      return {
        firstName: form.values.firstName.trim(),
        lastName: form.values.lastName.trim(),
        email: form.values.email.trim(),
      };
    }

    const positionPayload = {
      badgeNumber: form.values.badgeNumber,
      unitId,
      unitName: formatUnitName(unitName),
    };

    if (form.values.organizationId === 'sfso') {
      positionPayload.titleId = form.values.titleId;
      positionPayload.prop115Certified = form.values.prop115Certified;
    }

    return positionPayload;
  }, [form.values, section, unitId, unitName]);

  const hasChanged = form.isDirty() || (section === 'position' && (unitId !== (user?.unitId || '') || unitName !== formatUnitName(user?.unit?.name)));
  const isValidPersonalName = section !== 'personal' || (payload.firstName.length >= 2 && payload.lastName.length >= 2);

  const onSubmitMutation = useMutation({
    mutationFn: () => Api.users.update(userId, payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['users', userId], response.data);
      queryClient.invalidateQueries({ queryKey: ['members', response.data.organizationId] });
      showToast('Profile changes saved.', 'success');
      navigate(`/manage-users/${userId}`);
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  if (section !== 'personal' && section !== 'position') {
    return <Navigate to={`/manage-users/${userId}`} replace />;
  }

  if (section === 'position' && user && user.organizationId !== 'sfpd' && user.organizationId !== 'sfso') {
    return <Navigate to={`/manage-users/${userId}`} replace />;
  }

  const title = section === 'personal' ? 'Edit person information' : 'Edit position details';

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={`/manage-users/${userId}`} aria-label='Go back' />
        </Group>
      </Header>
      <Container>
        <Stack>
          <Title order={2}>{title}</Title>
          <form onSubmit={form.onSubmit(() => onSubmitMutation.mutateAsync())}>
            <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
              <Stack>
                {section === 'personal' && (
                  <>
                    <TextInput
                      {...form.getInputProps('firstName')}
                      label='First name'
                      placeholder='Enter first name'
                      required
                    />
                    <TextInput
                      {...form.getInputProps('lastName')}
                      label='Last name'
                      placeholder='Enter last name'
                      required
                    />
                    <TextInput
                      {...form.getInputProps('email')}
                      label='Email'
                      required
                    />
                  </>
                )}
                {section === 'position' && (
                  <>
                    <TextInput
                      {...form.getInputProps('badgeNumber')}
                      label='Star number'
                      placeholder='Enter badge or star number'
                    />
                    {form.values.organizationId === 'sfso' && (
                      <Select
                        {...form.getInputProps('titleId')}
                        label='Rank'
                        data={titles?.map((title) => ({ value: title.id, label: title.name })) || []}
                      />
                    )}
                    <Autocomplete
                      label='Unit'
                      placeholder='Type unit name'
                      data={autocompleteData}
                      value={unitName}
                      onChange={handleUnitChange}
                      disabled={!organizationId}
                      rightSection={units === undefined && organizationId ? <Loader size='sm' /> : null}
                      nothingFoundMessage='No units found'
                    />
                    {form.values.organizationId === 'sfso' && (
                      <Checkbox
                        {...form.getInputProps('prop115Certified', { type: 'checkbox' })}
                        label='Prop 115 certified'
                      />
                    )}
                  </>
                )}
                <Group>
                  <Button variant='light' color='red' onClick={() => navigate(`/manage-users/${userId}`)}>Cancel</Button>
                  <Button variant='secondary' type='submit' disabled={!hasChanged || !isValidPersonalName}>
                    Save changes
                  </Button>
                </Group>
              </Stack>
            </Fieldset>
          </form>
          <Box>
            <Text size='sm' ta='center' c='gray.5'>
              For assistance with profile updates, please contact <Anchor href='mailto:careconnect@sfgov.org' underline='always'>careconnect@sfgov.org</Anchor>
            </Text>
          </Box>
        </Stack>
      </Container>
    </>
  );
}

export default EditManagedUserPage;
