import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router';
import { Alert, Button, Container, Fieldset, Group, Stack, TextInput, Title, Loader, Breadcrumbs, Anchor } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminUnitForm () {
  const location = useLocation();
  const { organizationId, unitId } = useParams();
  const navigate = useNavigate();
  const isNew = !unitId;

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

  const { data: organization } = useQuery({
    queryKey: ['organizations', organizationId],
    queryFn: async () => {
      const response = await Api.organizations.get(organizationId);
      return response.data;
    }
  });

  const { data: unitResponse, isLoading } = useQuery({
    queryKey: ['organizations', organizationId, 'units', unitId],
    queryFn: () => Api.organizations.units.get(organizationId, unitId),
    enabled: !isNew,
  });

  useEffect(() => {
    if (unitResponse) {
      form.initialize(unitResponse.data);
    }
  }, [unitResponse]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => {
      if (isNew) {
        return Api.organizations.units.create(organizationId, values);
      } else {
        return Api.organizations.units.update(organizationId, unitId, values);
      }
    },
    onMutate: () => setSuccess(false),
    onSuccess: () => {
      setSuccess(true);
      if (isNew) {
        navigate(`/admin/organizations/${organizationId}/units`);
      }
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  const [success, setSuccess] = useState(false);

  function handleCancel () {
    navigate(-1);
  }

  const breadcrumbs = [
    { title: 'Admin', href: '/admin' },
    { title: 'Organizations', href: '/admin/organizations' },
    { title: organization?.name || 'Organization', href: `/admin/organizations/${organizationId}` },
    { title: 'Units', href: `/admin/organizations/${organizationId}/units` },
    { title: isNew ? 'New Unit' : 'Edit Unit', href: '#' },
  ].map((item, index) => (
    <Anchor component={Link} to={item.href} key={index}>
      {item.title}
    </Anchor>
  ));

  return (
    <>
      <Head>
        <title>{isNew ? 'New Unit' : 'Edit Unit'} - {organization?.name}</title>
      </Head>
      <Container>
        <Breadcrumbs mb='md'>{breadcrumbs}</Breadcrumbs>
        <Title mb='md'>{isNew ? 'New Unit' : 'Edit Unit'} for {organization?.name || <Loader size='sm' />}</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading} variant='unstyled'>
            <Stack w={{ base: '100%', xs: 320 }}>
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}
              {success && <Alert>Unit has been {isNew ? 'created' : 'updated'}!</Alert>}
              <TextInput
                {...form.getInputProps('id')}
                key={form.key('id')}
                label='ID'
                placeholder='e.g. patrol'
                disabled={!isNew}
              />
              <TextInput
                {...form.getInputProps('name')}
                key={form.key('name')}
                label='Name'
                placeholder='e.g. Patrol'
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

export default AdminUnitForm;
