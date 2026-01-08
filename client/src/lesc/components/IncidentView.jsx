import { useState, useEffect } from 'react';
import { Container, Stack, Text, Button, Group, TextInput, Loader } from '@mantine/core';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft } from '@tabler/icons-react';
import Api from '@/Api';
import { useToast } from '@/components/ToastContext';

/**
 * Incident View component - for viewing and editing incident information
 */
function IncidentView () {
  const navigate = useNavigate();
  const { incidentId } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [formData, setFormData] = useState(() => {
    return {
      cadNumber: '',
      dateTimeArrested: '',
      locationArrested: '',
      agency: '',
      charge: '',
      unit: '',
      badgeNumber: '',
    };
  });

  // Fetch incident data
  const { data: incidentResponse, isLoading: isLoadingIncident } = useQuery({
    queryKey: ['incidents', incidentId],
    queryFn: () => Api.lesc.incidents.get(incidentId),
    enabled: !!incidentId,
  });

  // Fetch incidents list (for list view)
  const { data: incidentsResponse, isLoading: isLoadingIncidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const response = await Api.lesc.incidents.list();
      return response.data;
    },
    enabled: !incidentId,
  });

  // Populate form with data when it becomes available
  useEffect(() => {
    if (incidentResponse?.data && !formData.cadNumber) {
      const incident = incidentResponse.data;
      // Convert dateTimeArrested to Pacific timezone for display
      let incidentDateTime = '';
      if (incident.dateTimeArrested) {
        const incidentDate = new Date(incident.dateTimeArrested);
        const incidentPacificTime = new Date(incidentDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
        const year = incidentPacificTime.getFullYear();
        const month = String(incidentPacificTime.getMonth() + 1).padStart(2, '0');
        const day = String(incidentPacificTime.getDate()).padStart(2, '0');
        const hours = String(incidentPacificTime.getHours()).padStart(2, '0');
        const minutes = String(incidentPacificTime.getMinutes()).padStart(2, '0');
        incidentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      }

      setFormData({
        cadNumber: incident.cadNumber || '',
        dateTimeArrested: incidentDateTime,
        locationArrested: incident.locationArrested || '',
        agency: incident.agency || '',
        charge: incident.charge || '',
        unit: incident.unit || '',
        badgeNumber: incident.badgeNumber || '',
      });
    }
  }, [incidentResponse?.data?.id]);

  const updateIncidentMutation = useMutation({
    mutationFn: (data) => {
      return Api.lesc.incidents.update(incidentId, {
        cadNumber: data.cadNumber || undefined,
        dateTimeArrested: data.dateTimeArrested ? new Date(data.dateTimeArrested).toISOString() : undefined,
        locationArrested: data.locationArrested || null,
        agency: data.agency || null,
        charge: data.charge || undefined,
        unit: data.unit || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
      showToast('Incident updated successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to update incident', error);
      showToast('Failed to update incident', 'error');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!incidentId) return;
    updateIncidentMutation.mutate(formData);
  };

  // If no incidentId, show list of incidents
  if (!incidentId) {
    if (isLoadingIncidents) {
      return (
        <Container>
          <Loader />
        </Container>
      );
    }

    const incidents = incidentsResponse || [];

    return (
      <Container>
        <Stack gap='md'>
          <Button
            leftSection={<IconArrowLeft size={18} />}
            variant='light'
            onClick={() => navigate(-1)}
            style={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>
          <Text
            style={{
              fontSize: '24px',
              lineHeight: '32px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 700,
              color: '#000000',
            }}
          >
            Incidents
          </Text>
          {incidents.length === 0
            ? (
              <Text>No incidents found</Text>
              )
            : (
              <Stack gap='sm'>
                {incidents.map((incident) => {
                  const dateStr = incident.dateTimeArrested
                    ? new Date(incident.dateTimeArrested).toLocaleString('en-US', {
                      timeZone: 'America/Los_Angeles',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                    : 'No date';
                  return (
                    <Button
                      key={incident.id}
                      variant='light'
                      fullWidth
                      onClick={() => navigate(`/incident/${incident.id}`)}
                      styles={{
                        root: {
                          justifyContent: 'flex-start',
                          height: 'auto',
                          padding: '12px',
                        },
                        inner: {
                          justifyContent: 'flex-start',
                          width: '100%',
                        },
                      }}
                    >
                      <Stack gap={4} style={{ width: '100%', textAlign: 'left', margin: 0, padding: 0 }}>
                        <Text fw={500} style={{ margin: 0, padding: 0 }}>CAD: {incident.cadNumber}</Text>
                        <Text size='sm' c='dimmed' style={{ margin: 0, padding: 0 }}>
                          {dateStr} • {incident.charge || 'No charge'}
                        </Text>
                        {incident.holdCount > 0 && (
                          <Text size='sm' c='dimmed' style={{ margin: 0, padding: 0 }}>
                            {incident.holdCount} hold{incident.holdCount !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </Stack>
                    </Button>
                  );
                })}
              </Stack>
              )}
        </Stack>
      </Container>
    );
  }

  if (isLoadingIncident) {
    return (
      <Container>
        <Loader />
      </Container>
    );
  }

  if (!incidentResponse?.data) {
    return (
      <Container>
        <Stack gap='md'>
          <Button
            leftSection={<IconArrowLeft size={18} />}
            variant='light'
            onClick={() => navigate('/incident')}
            style={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>
          <Text>Incident not found</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container>
      <Stack gap='md'>
        <Button
          leftSection={<IconArrowLeft size={18} />}
          variant='light'
          onClick={() => navigate(-1)}
          style={{ alignSelf: 'flex-start' }}
        >
          Back
        </Button>

        <form onSubmit={handleSubmit}>
          <Stack gap='xl'>
            {/* Incident Information */}
            <Stack gap='sm'>
              <Text
                style={{
                  fontSize: '24px',
                  lineHeight: '32px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                Incident Information
              </Text>
              <TextInput
                label='Incident ID'
                value={incidentResponse?.data?.id || ''}
                readOnly
                styles={{
                  input: {
                    fontSize: '16px',
                    backgroundColor: '#f5f5f5',
                  },
                }}
              />
              <TextInput
                label='CAD Number'
                placeholder='Enter CAD number'
                value={formData.cadNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, cadNumber: e.target.value }))}
                required
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
                  },
                }}
              />
              <TextInput
                label='Date/Time Arrested'
                type='datetime-local'
                value={formData.dateTimeArrested}
                onChange={(e) => setFormData(prev => ({ ...prev, dateTimeArrested: e.target.value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
                  },
                }}
              />
              <TextInput
                label='Location Arrested'
                placeholder='Enter location arrested'
                value={formData.locationArrested}
                onChange={(e) => setFormData(prev => ({ ...prev, locationArrested: e.target.value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
                  },
                }}
              />
              <TextInput
                label='Unit'
                placeholder='Enter unit'
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
                  },
                }}
              />
              <TextInput
                label='Star Number'
                placeholder='Enter badge number'
                value={formData.badgeNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, badgeNumber: e.target.value }))}
                readOnly
                styles={{
                  input: {
                    fontSize: '16px',
                    backgroundColor: '#f5f5f5',
                  },
                }}
              />
              <TextInput
                label='Agency'
                placeholder='Enter agency'
                value={formData.agency}
                onChange={(e) => setFormData(prev => ({ ...prev, agency: e.target.value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
                  },
                }}
              />
              <TextInput
                label='Charge'
                placeholder='Enter charge'
                value={formData.charge}
                onChange={(e) => setFormData(prev => ({ ...prev, charge: e.target.value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
                  },
                }}
              />
            </Stack>

            <Group justify='flex-end' mt='md'>
              <Button type='submit' loading={updateIncidentMutation.isPending}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}

export default IncidentView;
