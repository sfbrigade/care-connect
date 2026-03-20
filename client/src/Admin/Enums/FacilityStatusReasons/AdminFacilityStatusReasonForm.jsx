import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router';
import { Alert, Button, Container, Fieldset, Group, Stack, TextInput, Title, Select } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminFacilityStatusReasonForm () {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const reasonId = params.reasonId;
  const isNew = !reasonId;

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      id: '',
      type: null,
      description: '',
    },
    validate: {
      id: isNotEmpty('ID (Slug) is required.'),
      description: isNotEmpty('Description is required.'),
    },
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['facility-status-reasons', reasonId],
    queryFn: () => Api.facilities.statusReasons.get(reasonId),
    enabled: !!reasonId,
  });

  useEffect(() => {
    if (response) {
      form.initialize(response.data);
    }
  }, [response]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => {
      if (isNew) {
        return Api.facilities.statusReasons.create(values);
      } else {
        return Api.facilities.statusReasons.update(reasonId, values);
      }
    },
    onMutate: () => setSuccess(false),
    onSuccess: () => {
      setSuccess(true);
      if (isNew) {
        navigate('/admin/facility-status-reasons');
      }
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => Api.facilities.statusReasons.delete(reasonId),
    onSuccess: () => {
      navigate('/admin/facility-status-reasons');
    },
    onError: (errors) => form.setErrors(errors),
  });

  const [success, setSuccess] = useState(false);

  function handleCancel () {
    navigate(-1);
  }

  function handleDelete () {
    if (window.confirm('Are you sure you want to delete this status reason?')) {
      deleteMutation.mutate();
    }
  }

  return (
    <>
      <Head>
        <title>{isNew ? 'New Status Reason' : 'Edit Status Reason'}</title>
      </Head>
      <Container>
        <Title mb='md'>{isNew ? 'New Status Reason' : 'Edit Status Reason'}</Title>
        <form onSubmit={form.onSubmit((values) => onSubmitMutation.mutateAsync(values))}>
          <Fieldset disabled={isLoading} variant='unstyled'>
            <Stack>
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}
              {success && <Alert>Status reason has been {isNew ? 'created' : 'updated'}!</Alert>}

              <TextInput
                {...form.getInputProps('id')}
                key={form.key('id')}
                label='ID (Slug)'
                required
                withAsterisk={false}
                placeholder='e.g. no_beds_available'
                disabled={!isNew}
              />

              <Select
                {...form.getInputProps('type')}
                key={form.key('type')}
                label='Facility Type'
                placeholder='Applies to...'
                data={[
                  { value: '', label: 'All' },
                  { value: 'DIDO', label: 'DIDO' },
                  { value: 'LESC', label: 'LESC' },
                ]}
                clearable
              />

              <TextInput
                {...form.getInputProps('description')}
                key={form.key('description')}
                label='Description'
                required
                withAsterisk={false}
                placeholder='e.g. No beds available'
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

export default AdminFacilityStatusReasonForm;
