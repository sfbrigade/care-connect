import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Button, Container, Fieldset, Group, NumberInput, Select, Stack, Textarea, Title, LoadingOverlay } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminBedStatusForm () {
  const { facilityId, bedStatusId } = useParams();
  const navigate = useNavigate();

  const { data: facility } = useQuery({
    queryKey: ['facility', facilityId],
    queryFn: async () => {
      const response = await Api.facilities.get(facilityId);
      return response.data;
    }
  });

  const { data: bedStatus, isLoading: isLoadingBedStatus } = useQuery({
    queryKey: ['bed-status', bedStatusId],
    queryFn: async () => {
      const response = await Api.facilities.bedStatuses.get(facilityId, bedStatusId);
      return response.data;
    },
    enabled: !!bedStatusId,
  });

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      type: 'BED',
      capacity: 0,
      unavailableUnoccupied: 0,
      unavailableOccupied: 0,
      updateNotes: '',
    },
    validate: {
      type: isNotEmpty('Type is required'),
      capacity: (value) => (value < 0 ? 'Capacity cannot be negative' : null),
      unavailableUnoccupied: (value) => (value < 0 ? 'Cannot be negative' : null),
      unavailableOccupied: (value) => (value < 0 ? 'Cannot be negative' : null),
    }
  });

  useEffect(() => {
    if (bedStatus) {
      form.setValues({
        type: bedStatus.type,
        capacity: bedStatus.capacity,
        unavailableUnoccupied: bedStatus.unavailableUnoccupied,
        unavailableOccupied: bedStatus.unavailableOccupied,
        updateNotes: '',
      });
    }
  }, [bedStatus]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        ...values,
        capacity: Number(values.capacity),
        unavailableUnoccupied: Number(values.unavailableUnoccupied),
        unavailableOccupied: Number(values.unavailableOccupied),
      };

      if (bedStatusId) {
        return Api.facilities.bedStatuses.update(facilityId, bedStatusId, payload);
      }

      delete payload.updateNotes;
      return Api.facilities.bedStatuses.create(facilityId, payload);
    },
    onSuccess: () => navigate(`/admin/facilities/${facilityId}/bed-statuses`),
    onError: (errors) => {
      form.setErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  function handleCancel () {
    navigate(-1);
  }

  return (
    <>
      <Head>
        <title>{bedStatusId ? 'Edit' : 'New'} Bed Status - {facility?.name}</title>
      </Head>
      <Container pos='relative'>
        <LoadingOverlay visible={isLoadingBedStatus} />
        <Title mb='md'>{bedStatusId ? 'Edit' : 'New'} Bed Status for {facility?.name}</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={onSubmitMutation.isPending} variant='unstyled'>
            <Stack>
              {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}

              <Select
                {...form.getInputProps('type')}
                key={form.key('type')}
                label='Type'
                data={[
                  { value: 'BED', label: 'BED' },
                  { value: 'CHAIR', label: 'CHAIR' },
                ]}
                required
              />

              <NumberInput
                {...form.getInputProps('capacity')}
                key={form.key('capacity')}
                label='Total Capacity'
                description='Total number of beds/chairs.'
                min={0}
                required
              />

              <NumberInput
                {...form.getInputProps('unavailableUnoccupied')}
                key={form.key('unavailableUnoccupied')}
                label='Unavailable Unoccupied'
                description='Beds that are empty but cannot be used (e.g. broken).'
                min={0}
              />

              <NumberInput
                {...form.getInputProps('unavailableOccupied')}
                key={form.key('unavailableOccupied')}
                label='Unavailable Occupied'
                description='Beds that are occupied but unavailable.'
                min={0}
              />

              {bedStatusId && (
                <Textarea
                  {...form.getInputProps('updateNotes')}
                  key={form.key('updateNotes')}
                  label='Update Notes'
                  description='Reason for this update.'
                  rows={3}
                />
              )}

              <Group>
                <Button disabled={onSubmitMutation.isPending} type='submit'>{bedStatusId ? 'Update' : 'Create'} Bed Status</Button>
                <Button variant='light' onClick={handleCancel} disabled={onSubmitMutation.isPending}>Cancel</Button>
              </Group>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default AdminBedStatusForm;
