import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Stack, Select, NumberInput, Textarea, Button, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import Api from '../Api';

function HoldForm ({ onSuccess }) {
  const [facilityId, setFacilityId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [bedsRequested, setBedsRequested] = useState(1);
  const [notes, setNotes] = useState('');

  const { data: availability } = useQuery({
    queryKey: ['lesc-availability'],
    queryFn: async () => {
      const response = await Api.lesc.availability();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => Api.lesc.holds.create(data),
    onSuccess: () => {
      onSuccess();
    },
  });

  // Get unique facilities from availability data
  const facilities = availability ? [...new Map(availability.map(item => [item.facilityId, { id: item.facilityId, name: item.facilityName }])).values()] : [];

  // Get service types for selected facility
  const serviceTypes = availability
    ? availability
        .filter(item => item.facilityId === facilityId)
        .map(item => ({
          value: item.serviceTypeId,
          label: item.serviceTypeName,
          available: item.calculatedAvailable,
        }))
    : [];

  // Reset service type when facility changes
  useEffect(() => {
    setServiceTypeId('');
  }, [facilityId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      facilityId,
      serviceTypeId,
      bedsRequested,
      notes: notes || undefined,
    });
  };

  const selectedService = serviceTypes.find(st => st.value === serviceTypeId);
  const maxBeds = selectedService ? selectedService.available : 0;

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        {createMutation.error && (
          <Alert icon={<IconAlertCircle />} title='Error' color='red'>
            {createMutation.error.response?.data?.error || 'Failed to create hold'}
          </Alert>
        )}

        <Select
          label='Facility'
          placeholder='Select facility'
          data={facilities.map(f => ({ value: f.id, label: f.name }))}
          value={facilityId}
          onChange={setFacilityId}
          required
        />

        {facilityId && (
          <Select
            label='Service Type'
            placeholder='Select service type'
            data={serviceTypes.map(st => ({
              value: st.value,
              label: `${st.label} (${st.available} available)`,
            }))}
            value={serviceTypeId}
            onChange={setServiceTypeId}
            required
            disabled={serviceTypes.length === 0}
          />
        )}

        {serviceTypeId && (
          <NumberInput
            label='Beds Requested'
            placeholder='Number of beds'
            value={bedsRequested}
            onChange={setBedsRequested}
            min={1}
            max={maxBeds}
            required
          />
        )}

        <Textarea
          label='Notes (optional)'
          placeholder='Additional notes'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <Button type='submit' loading={createMutation.isPending} disabled={!facilityId || !serviceTypeId}>
          Create Hold
        </Button>
      </Stack>
    </form>
  );
}

export default HoldForm;

