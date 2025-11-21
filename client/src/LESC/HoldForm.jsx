import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Stack, Select, Textarea, Button, Alert, Text, Group } from '@mantine/core';
import { useNavigate } from 'react-router';
import { IconAlertCircle } from '@tabler/icons-react';

import Api from '../Api';
import Chip from '../Components/Chip';

function HoldForm ({ onSuccess }) {
  const navigate = useNavigate();
  const [facilityId, setFacilityId] = useState('');
  const [notes, setNotes] = useState('');
  const [bedsRequested, setBedsRequested] = useState(1);

  const { data: availability } = useQuery({
    queryKey: ['lesc-availability'],
    queryFn: async () => {
      const response = await Api.lesc.availability();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => Api.lesc.holds.create(data),
    onSuccess: (data) => {
      onSuccess?.();
      // Navigate to success screen
      navigate('/lesc/success', {
        state: {
          holdData: data.data,
        },
      });
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
      bedsRequested: bedsRequested,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap='xl'>
        {createMutation.error && (
          <Alert icon={<IconAlertCircle />} title='Error' color='red'>
            {createMutation.error.response?.data?.error || 'Failed to create hold'}
          </Alert>
        )}

        <div>
          <Text
            style={{
              fontSize: '18px',
              lineHeight: '28px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#000000',
              marginBottom: '8px',
            }}
          >
            Hold Details
          </Text>
        </div>

        <Select
          label='Facility'
          placeholder='Select facility'
          data={facilities}
          value={facilityId}
          onChange={setFacilityId}
          required
          searchable
        />

        <Stack gap='sm'>
          <Text
            style={{
              fontSize: '18px',
              lineHeight: '28px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#000000',
            }}
          >
            For how many people?
          </Text>
          <Group gap='sm'>
            {[1, 2, 3, 4, 5].map((num) => (
              <Chip
                key={num}
                active={bedsRequested === num}
                onClick={() => setBedsRequested(num)}
              >
                {num}
              </Chip>
            ))}
          </Group>
        </Stack>

        <div>
          <Text
            style={{
              fontSize: '18px',
              lineHeight: '28px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#000000',
              marginBottom: '8px',
            }}
          >
            Notes (optional)
          </Text>
          <Textarea
            placeholder='2 individuals sobering, no medical clearance needed'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            styles={{
              input: {
                borderRadius: '16px',
              },
            }}
          />
        </div>

        <Text
          style={{
            fontSize: '14px',
            lineHeight: '20px',
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 400,
            color: '#868e96',
          }}
        >
          Holds will expire automatically after selected time unless extended.
        </Text>

        <Group justify='flex-end' gap='sm'>
          <Button variant='light' type='button' onClick={() => onSuccess?.()}>
            Cancel
          </Button>
          <Button type='submit' loading={createMutation.isPending} disabled={!facilityId}>
            Create Hold
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default HoldForm;

