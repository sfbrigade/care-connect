import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router';
import { Alert, Button, Container, Fieldset, Group, Stack, TextInput, Title, Select } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminDeflectionDetailForm () {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const detailId = params.reasonId;
  const isNew = !detailId;
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      id: '',
      name: '',
      deflectionDetailCategoryId: ''
    },
    validate: {
      id: isNotEmpty('ID (Slug) is required.'),
      name: isNotEmpty('Name is required.'),
      deflectionDetailCategoryId: isNotEmpty('Detail Category is required.'),
    },
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['deflection', 'details', detailId],
    queryFn: () => Api.deflections.details.get(detailId),
    enabled: !!detailId,
  });

  const { data: detailCategories } = useQuery({
    queryKey: ['deflection', 'detailCategories', 'index'],
    queryFn: async () => {
      const response = await Api.deflections.detailCategories.index();
      return response.data;
    }
  });

  useEffect(() => {
    if (response) {
      console.log(response.data);
      form.initialize(response.data);
    }
  }, [response]);

  const [success, setSuccess] = useState(false);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => {
      if (isNew) {
        return Api.deflections.details.create(values);
      }
      return Api.deflections.details.update(detailId, values);
    },
    onMutate: () => setSuccess(false),
    onSuccess: () => {
      setSuccess(true);
      if (isNew) {
        navigate('/admin/enums/deflection-details');
      }
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => Api.deflections.details.delete(detailId),
    onSuccess: () => {
      navigate('/admin/enums/deflection-details');
    },
    onError: (errors) => form.setErrors(errors),
  });

  function handleCancel () {
    navigate(-1);
  }

  function handleDelete () {
    if (window.confirm('Are you sure you want to delete this deflection detail?')) {
      deleteMutation.mutate();
    }
  }

  return (
    <>
      <Head>
        <title>{isNew ? 'New Deflection Detail' : 'Edit Deflection Detail'}</title>
      </Head>
      <Container>
        <Title mb='md'>{isNew ? 'New Deflection Detail' : 'Edit Deflection Detail'}</Title>
        <form onSubmit={form.onSubmit((values) => onSubmitMutation.mutateAsync(values))}>
          <Fieldset disabled={isLoading} variant='unstyled'>
            <Stack>
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}
              {success && <Alert>Deflection detail has been {isNew ? 'created' : 'updated'}!</Alert>}

              <TextInput
                {...form.getInputProps('id')}
                key={form.key('id')}
                label='ID (Slug)'
                placeholder='e.g. possible_drug_use'
                disabled={!isNew}
              />

              <TextInput
                {...form.getInputProps('name')}
                key={form.key('name')}
                label='Name'
                placeholder='e.g. Possible Drug Use'
              />

              <Select
                {...form.getInputProps('deflectionDetailCategoryId')}
                key={form.key('deflectionDetailCategoryId')}
                label='Detail Category'
                data={detailCategories?.map((x) => x.id)}
                placeholder='e.g. Drug Specific'
                searchable
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
                {!isNew && (
                  <Button
                    color='red'
                    variant='light'
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending || onSubmitMutation.isPending}
                  >
                    Delete
                  </Button>
                )}
              </Group>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default AdminDeflectionDetailForm;
