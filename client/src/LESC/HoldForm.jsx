import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Stack, Select, Textarea, Button, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import Api from '../Api';

function HoldForm ({ onSuccess }) {
  const [facilityId, setFacilityId] = useState('');
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

  // Get unique facilities from availability data, showing max available beds
  const facilities = availability
    ? [...new Map(availability.map(item => [item.facilityId, {
      id: item.facilityId,
      name: item.facilityName,
    }])).values()]
        .map(f => {
          // Find all service types for this facility and get the one with most availability
          const facilityServices = availability.filter(item => item.facilityId === f.id);
          const maxAvailable = Math.max(...facilityServices.map(s => s.calculatedAvailable));
          return {
            value: f.id,
            label: `${f.name} (${maxAvailable} available)`,
          };
        })
    : [];

  // Get the service type with most availability for the selected facility
  const getServiceTypeForFacility = (facId) => {
    if (!availability || !facId) return null;
    const facilityServices = availability.filter(item => item.facilityId === facId);
    if (facilityServices.length === 0) return null;
    // Return the service type with the most available beds
    return facilityServices.reduce((best, current) => 
      current.calculatedAvailable > best.calculatedAvailable ? current : best
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const serviceInfo = getServiceTypeForFacility(facilityId);
    
    if (!serviceInfo) {
      return;
    }

    createMutation.mutate({
      facilityId,
      serviceTypeId: serviceInfo.serviceTypeId,
      bedsRequested: 1, // Default to 1 bed
      notes: notes || undefined,
    });
  };

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
          data={facilities}
          value={facilityId}
          onChange={setFacilityId}
          required
          searchable
        />

        <Textarea
          label='Notes (optional)'
          placeholder='Additional notes'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <Button type='submit' loading={createMutation.isPending} disabled={!facilityId}>
          Create Hold
        </Button>
      </Stack>
    </form>
  );
}

export default HoldForm;

