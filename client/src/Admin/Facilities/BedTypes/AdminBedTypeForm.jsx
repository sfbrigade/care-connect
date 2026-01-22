import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Button, Container, Fieldset, Group, NumberInput, Select, Stack, Textarea, Title, LoadingOverlay } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminBedTypeForm () {
  const { facilityId, bedTypeId } = useParams();
  const navigate = useNavigate();

  const { data: facility } = useQuery({
    queryKey: ['facility', facilityId],
    queryFn: async () => {
      const response = await Api.facilities.get(facilityId);
      return response.data;
    }
  });

  const { data: bedType, isLoading: isLoadingBedType } = useQuery({
    queryKey: ['bed-type', bedTypeId],
    queryFn: async () => {
      const response = await Api.facilities.bedTypes.get(facilityId, bedTypeId);
      return response.data;
    },
    enabled: !!bedTypeId,
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
    if (bedType) {
      form.setValues({
        type: bedType.type,
        capacity: bedType.capacity,
        unavailableUnoccupied: bedType.unavailableUnoccupied,
        unavailableOccupied: bedType.unavailableOccupied,
        updateNotes: '',
      });
    }
  }, [bedType]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        ...values,
        capacity: Number(values.capacity),
        unavailableUnoccupied: Number(values.unavailableUnoccupied),
        unavailableOccupied: Number(values.unavailableOccupied),
      };

      if (bedTypeId) {
        return Api.facilities.bedTypes.update(facilityId, bedTypeId, payload);
      }

      delete payload.updateNotes;
      return Api.facilities.bedTypes.create(facilityId, payload);
    },
    onSuccess: () => navigate(`/admin/facilities/${facilityId}/bed-types`),
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
        <title>{bedTypeId ? 'Edit' : 'New'} Bed Type - {facility?.name}</title>
      </Head>
      <Container pos='relative'>
        <LoadingOverlay visible={isLoadingBedType} />
        <Title mb='md'>{bedTypeId ? 'Edit' : 'New'} Bed Type for {facility?.name}</Title>
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

              {bedTypeId && (
                <Textarea
                  {...form.getInputProps('updateNotes')}
                  key={form.key('updateNotes')}
                  label='Update Notes'
                  description='Reason for this update.'
                  rows={3}
                />
              )}

              <Group>
                <Button disabled={onSubmitMutation.isPending} type='submit'>{bedTypeId ? 'Update' : 'Create'} Bed Type</Button>
                <Button variant='light' onClick={handleCancel} disabled={onSubmitMutation.isPending}>Cancel</Button>
              </Group>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default AdminBedTypeForm;
