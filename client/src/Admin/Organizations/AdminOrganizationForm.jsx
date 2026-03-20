import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router';
import { Alert, Button, Container, Fieldset, Group, Stack, TextInput, Title } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function OrganizationForm () {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const organizationId = params.organizationId;
  const isNew = !organizationId;

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      id: '',
      name: '',
    },
    validate: {
      id: isNotEmpty('ID is required.'),
      name: isNotEmpty('Name is required.'),
    },
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['organizations', organizationId],
    queryFn: () => Api.organizations.get(organizationId),
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (response) {
      form.initialize(response.data);
    }
  }, [response]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => {
      if (isNew) {
        return Api.organizations.create(values);
      } else {
        return Api.organizations.update(organizationId, values);
      }
    },
    onMutate: () => setSuccess(false),
    onSuccess: () => {
      setSuccess(true);
      if (isNew) {
        navigate('/admin/organizations');
      }
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });
  const [success, setSuccess] = useState(false);

  function handleCancel () {
    navigate(-1);
  }

  return (
    <>
      <Head>
        <title>{isNew ? 'New Organization' : 'Edit Organization'}</title>
      </Head>
      <Container>
        <Title mb='md'>{isNew ? 'New Organization' : 'Edit Organization'}</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading} variant='unstyled'>
            <Stack w={{ base: '100%', xs: 320 }}>
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}
              {success && <Alert>Organization has been {isNew ? 'created' : 'updated'}!</Alert>}
              <TextInput
                {...form.getInputProps('id')}
                key={form.key('id')}
                label='ID'
                required
                withAsterisk={false}
                placeholder='e.g. sfpd'
                disabled={!isNew}
              />
              <TextInput
                {...form.getInputProps('name')}
                key={form.key('name')}
                label='Name'
                required
                withAsterisk={false}
                placeholder='e.g. San Francisco Police Department'
              />
              <Group>
                <Button disabled={onSubmitMutation.isPending} type='submit'>Submit</Button>
                <Button
                  variant='light'
                  onClick={handleCancel}
                  disabled={onSubmitMutation.isPending}
                >
                  Cancel
                </Button>
              </Group>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default OrganizationForm;
