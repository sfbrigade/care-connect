import { useEffect } from 'react';
import { Anchor, Button, Checkbox, Container, Fieldset, Group, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';

function EditUserProfilePage () {
  const { user } = useAuthContext();
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      badgeNumber: '',
      organizationId: '',
      unitId: '',
      titleId: '',
      prop115Certified: false,
    }
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => Api.users.get(userId),
  });

  const { data: units } = useQuery({
    queryKey: ['organizations', form.getValues().organizationId, 'units'],
    queryFn: () => Api.organizations.units.index(form.getValues().organizationId).then(response => response.data),
    enabled: !!form.getValues().organizationId,
  });

  const { data: titles } = useQuery({
    queryKey: ['organizations', form.getValues().organizationId, 'titles'],
    queryFn: () => Api.organizations.titles.index(form.getValues().organizationId).then(response => response.data),
    enabled: !!form.getValues().organizationId,
  });

  useEffect(() => {
    if (response) {
      const values = {
        ...response.data,
        password: '',
      };
      form.setInitialValues(values);
      form.setValues(values);
      form.resetDirty(values);
    }
  }, [response]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.users.update(userId, values),
    onSuccess: (response) => {
      queryClient.setQueryData(['users', userId], response);
      if (userId === user?.id) {
        queryClient.setQueryData(['users', 'me'], response.data);
      }
      showToast('Your profile has been updated', 'success');
      navigate('/profile');
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  return (
    <>
      <Head>
        <title>Edit position details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to='/profile' />
        </Group>
      </Header>
      <Container>
        <Stack>
          <Title order={2}>Edit position details</Title>
          <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
            <Fieldset disabled={isLoading} variant='unstyled'>
              <Stack>
                <TextInput
                  {...form.getInputProps('badgeNumber')}
                  key={form.key('badgeNumber')}
                  label='Star Number'
                  placeholder='Enter badge or star number'
                />
                {form.getValues().organizationId === 'sfso' && (
                  <Select
                    {...form.getInputProps('titleId')}
                    key={form.key('titleId')}
                    label='Rank'
                    data={titles?.map((title) => ({ value: title.id, label: title.name })) || []}
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
                {form.getValues().organizationId === 'sfso' && (
                  <Checkbox
                    {...form.getInputProps('prop115Certified', { type: 'checkbox' })}
                    key={form.key('prop115Certified')}
                    label='Prop 115 certified'
                  />
                )}
                <Group>
                  <Button variant='light' color='red' onClick={() => navigate('/profile')}>Cancel</Button>
                  <Button variant='secondary' type='submit'>Save changes</Button>
                </Group>
              </Stack>
            </Fieldset>
          </form>
          <Text size='sm' ta='center' c='gray.5'>
            For assistance with profile updates, please contact <Anchor href='mailto:careconnect@sfgov.org'>careconnect@sfgov.org</Anchor>
          </Text>
        </Stack>
      </Container>
    </>
  );
}

export default EditUserProfilePage;
