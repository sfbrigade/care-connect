import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router';
import { Alert, Button, Container, Fieldset, Group, Stack, TextInput, Title, Loader, Breadcrumbs, Anchor } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminTitleForm () {
  const location = useLocation();
  const { organizationId, titleId } = useParams();
  const navigate = useNavigate();
  const isNew = !titleId;

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

  const { data: titleResponse, isLoading } = useQuery({
    queryKey: ['organizations', organizationId, 'titles', titleId],
    queryFn: () => Api.organizations.titles.get(organizationId, titleId),
    enabled: !isNew,
  });

  useEffect(() => {
    if (titleResponse) {
      form.initialize(titleResponse.data);
    }
  }, [titleResponse]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => {
      if (isNew) {
        return Api.organizations.titles.create(organizationId, values);
      } else {
        return Api.organizations.titles.update(organizationId, titleId, values);
      }
    },
    onMutate: () => setSuccess(false),
    onSuccess: () => {
      setSuccess(true);
      if (isNew) {
        navigate(`/admin/organizations/${organizationId}/titles`);
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
    { title: 'Titles', href: `/admin/organizations/${organizationId}/titles` },
    { title: isNew ? 'New Title' : 'Edit Title', href: '#' },
  ].map((item, index) => (
    <Anchor component={Link} to={item.href} key={index}>
      {item.title}
    </Anchor>
  ));

  return (
    <>
      <Head>
        <title>{isNew ? 'New Title' : 'Edit Title'} - {organization?.name}</title>
      </Head>
      <Container>
        <Breadcrumbs mb='md'>{breadcrumbs}</Breadcrumbs>
        <Title mb='md'>{isNew ? 'New Title' : 'Edit Title'} for {organization?.name || <Loader size='sm' />}</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading} variant='unstyled'>
            <Stack w={{ base: '100%', xs: 320 }}>
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}
              {success && <Alert>Title has been {isNew ? 'created' : 'updated'}!</Alert>}
              <TextInput
                {...form.getInputProps('id')}
                key={form.key('id')}
                label='ID'
                required
                withAsterisk={false}
                placeholder='e.g. officer'
                disabled={!isNew}
              />
              <TextInput
                {...form.getInputProps('name')}
                key={form.key('name')}
                label='Name'
                required
                withAsterisk={false}
                placeholder='e.g. Officer'
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

export default AdminTitleForm;
