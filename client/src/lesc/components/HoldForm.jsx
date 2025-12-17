import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Stack, Select, Textarea, Button, Alert, Text, Group, TextInput } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import Api from '@/Api';
import Chip from '@/components/Chip';

function HoldForm ({ onSuccess, onCancel, initialFacilityId, initialServiceTypeId }) {
  const navigate = useNavigate();
  const [facilityId, setFacilityId] = useState(initialFacilityId || '');
  const [notes, setNotes] = useState('');
  const [bedsRequested, setBedsRequested] = useState(1);
  const [cadNumber, setCadNumber] = useState('');
  const [foundIncident, setFoundIncident] = useState(null);
  const [isLookingUpCad, setIsLookingUpCad] = useState(false);

  const { data: availability } = useQuery({
    queryKey: ['lesc-availability'],
    queryFn: async () => {
      const response = await Api.lesc.availability();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => Api.lesc.holds.create(data),
    onSuccess: (response, variables) => {
      // API returns an array of holds (one per bed), use the first one for navigation
      const holds = response.data;
      if (holds && holds.length > 0) {
        const firstHold = holds[0];
        // Navigate to success page with hold data
        navigate('/lesc/success', {
          state: {
            holdData: {
              id: firstHold.id,
              bedsRequested: variables.bedsRequested, // Use the requested amount, not individual hold amount
              expiresAt: firstHold.expiresAt,
            },
          },
        });
      }
      onSuccess?.();
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

  // Auto-populate facility if there's only one available and no initialFacilityId is provided
  useEffect(() => {
    if (!initialFacilityId && facilities.length === 1 && !facilityId) {
      setFacilityId(facilities[0].value);
    }
  }, [facilities, initialFacilityId, facilityId]);

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

  // Get available beds for the selected facility
  const getAvailableBeds = () => {
    if (!availability || !facilityId) return null;
    const serviceInfo = getServiceTypeForFacility(facilityId);
    return serviceInfo ? serviceInfo.calculatedAvailable : null;
  };

  const availableBeds = getAvailableBeds();

  // Reset bedsRequested if it exceeds available beds when availability changes
  useEffect(() => {
    if (availableBeds !== null && bedsRequested > availableBeds) {
      setBedsRequested(Math.min(bedsRequested, availableBeds));
    }
  }, [availableBeds, bedsRequested]);

  // Lookup incident by CAD number when CAD number changes
  useEffect(() => {
    const lookupCad = async () => {
      if (!cadNumber || cadNumber.trim() === '') {
        setFoundIncident(null);
        return;
      }

      setIsLookingUpCad(true);
      try {
        const response = await Api.lesc.incidents.findByCad(cadNumber.trim());
        setFoundIncident(response.data);
      } catch (error) {
        // 404 is expected if no incident found
        if (error.response?.status === 404) {
          setFoundIncident(null);
        } else {
          console.error('Failed to lookup CAD number', error);
          setFoundIncident(null);
        }
      } finally {
        setIsLookingUpCad(false);
      }
    };

    // Debounce the lookup
    const timeoutId = setTimeout(lookupCad, 500);
    return () => clearTimeout(timeoutId);
  }, [cadNumber]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Use initialServiceTypeId if provided, otherwise find the service type with most availability
    let serviceTypeId = initialServiceTypeId;
    if (!serviceTypeId) {
      const serviceInfo = getServiceTypeForFacility(facilityId);
      if (!serviceInfo) {
        return;
      }
      serviceTypeId = serviceInfo.serviceTypeId;
    }

    // If CAD number is provided but no incident found, create one (or get existing)
    let incidentId = foundIncident?.id || null;
    if (cadNumber && cadNumber.trim() && !incidentId) {
      try {
        // This will return existing incident if found, or create new one
        const incidentResponse = await Api.lesc.incidents.create({
          cadNumber: cadNumber.trim(),
          dateTimeArrested: new Date().toISOString(),
          charge: '647(f) RWS',
        });
        incidentId = incidentResponse.data.id;
      } catch (error) {
        console.error('Failed to create/find incident for CAD number', error);
        // Continue without incident if creation fails
      }
    }

    createMutation.mutate({
      facilityId,
      serviceTypeId,
      bedsRequested,
      notes: notes || undefined,
      incidentId: incidentId || undefined,
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

        {!initialFacilityId && (
          <Select
            label='Facility'
            placeholder='Select facility'
            data={facilities}
            value={facilityId}
            onChange={setFacilityId}
            required
            searchable
            comboboxProps={{ withinPortal: true }}
            maxDropdownHeight={200}
            styles={{
              input: {
                fontSize: '16px', // Prevent mobile zoom on focus
              },
              dropdown: {
                maxHeight: '200px',
                overflowY: 'auto',
              },
            }}
          />
        )}

        {initialFacilityId && facilityId && availability && (
          <Text size='sm' c='dimmed'>
            Facility: {availability.find(item => item.facilityId === facilityId)?.facilityName || facilityId}
          </Text>
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
            CAD Number (optional)
          </Text>
          <TextInput
            placeholder='Enter CAD number to link to existing incident'
            value={cadNumber}
            onChange={(e) => setCadNumber(e.target.value)}
            styles={{
              input: {
                fontSize: '16px', // Prevent iOS zoom
              },
            }}
          />
          {isLookingUpCad && (
            <Text size='sm' c='dimmed' mt={4}>
              Looking up incident...
            </Text>
          )}
          {foundIncident && !isLookingUpCad && (
            <Text size='sm' c='green' mt={4}>
              Found incident: {foundIncident.cadNumber} ({foundIncident.charge || 'No charge'}) - Hold will be linked
            </Text>
          )}
          {cadNumber && !foundIncident && !isLookingUpCad && (
            <Text size='sm' c='dimmed' mt={4}>
              No existing incident found - A new incident will be created for this CAD number
            </Text>
          )}
        </div>

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
            {[1, 2, 3, 4, 5].map((num) => {
              const isDisabled = availableBeds !== null && availableBeds < 5 && num > availableBeds;
              return (
                <Chip
                  key={num}
                  active={bedsRequested === num}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setBedsRequested(num)}
                >
                  {num}
                </Chip>
              );
            })}
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
                fontSize: '16px', // Prevent iOS zoom
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
          <Button variant='light' type='button' onClick={() => onCancel?.() || onSuccess?.()}>
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
