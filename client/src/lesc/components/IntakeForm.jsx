import { useState, useEffect } from 'react';
import { Container, Stack, Text, Button, Group, Select, TextInput, Loader, NumberInput, Textarea } from '@mantine/core';
import { useNavigate, useLocation, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft } from '@tabler/icons-react';
import Api from '@/Api';

/**
 * Date input component with spinners for month, day, and year
 * Converts between YYYY-MM-DD format (for API) and separate month/day/year fields
 */
function DateInput ({ label, value, onChange, ...props }) {
  // Parse YYYY-MM-DD format into month, day, year
  const parseDate = (dateStr) => {
    if (!dateStr) return { month: null, day: null, year: null };
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return {
        year: parseInt(parts[0], 10) || null,
        month: parseInt(parts[1], 10) || null,
        day: parseInt(parts[2], 10) || null,
      };
    }
    return { month: null, day: null, year: null };
  };

  // Format month, day, year into YYYY-MM-DD
  const formatDate = (month, day, year) => {
    if (!month || !day || !year) return '';
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const yearStr = String(year);
    return `${yearStr}-${monthStr}-${dayStr}`;
  };

  const initialDate = parseDate(value);
  const [month, setMonth] = useState(initialDate.month);
  const [day, setDay] = useState(initialDate.day);
  const [year, setYear] = useState(initialDate.year);

  // Update local state when value prop changes
  useEffect(() => {
    const parsed = parseDate(value);
    setMonth(parsed.month);
    setDay(parsed.day);
    setYear(parsed.year);
  }, [value]);

  // Validate and update parent when any field changes
  const handleChange = (field, newValue) => {
    let newMonth = month;
    let newDay = day;
    let newYear = year;

    if (field === 'month') {
      newMonth = newValue;
      setMonth(newValue);
    } else if (field === 'day') {
      newDay = newValue;
      setDay(newValue);
    } else if (field === 'year') {
      newYear = newValue;
      setYear(newValue);
    }

    // Validate date
    if (newMonth && newDay && newYear) {
      // Check if date is valid
      const date = new Date(newYear, newMonth - 1, newDay);
      if (
        date.getFullYear() === newYear &&
        date.getMonth() === newMonth - 1 &&
        date.getDate() === newDay
      ) {
        const formatted = formatDate(newMonth, newDay, newYear);
        onChange?.({ target: { value: formatted } });
      }
    } else if (newMonth === null && newDay === null && newYear === null) {
      // All fields cleared
      onChange?.({ target: { value: '' } });
    }
  };

  return (
    <div>
      <Text size='sm' fw={500} mb={4}>{label}</Text>
      <Group gap='xs' align='flex-start'>
        <NumberInput
          label='Month'
          placeholder='MM'
          value={month}
          onChange={(val) => handleChange('month', val)}
          min={1}
          max={12}
          style={{ flex: 1 }}
          styles={{
            input: {
              fontSize: '16px', // Prevent iOS zoom
            },
          }}
          {...props}
        />
        <NumberInput
          label='Day'
          placeholder='DD'
          value={day}
          onChange={(val) => handleChange('day', val)}
          min={1}
          max={31}
          style={{ flex: 1 }}
          styles={{
            input: {
              fontSize: '16px', // Prevent iOS zoom
            },
          }}
          {...props}
        />
        <NumberInput
          label='Year'
          placeholder='YYYY'
          value={year}
          onChange={(val) => handleChange('year', val)}
          min={1900}
          max={new Date().getFullYear()}
          style={{ flex: 2 }}
          styles={{
            input: {
              fontSize: '16px', // Prevent iOS zoom
            },
          }}
          {...props}
        />
      </Group>
    </div>
  );
}

/**
 * Intake Form component - matches Figma "Start Report / Intake Form" design
 * Can be used for creating new intake records or editing existing clients
 */
function IntakeForm () {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const clientId = params.clientId;
  const holdIdParam = params.holdId;
  const holdId = location.state?.holdId || holdIdParam;
  const queryClient = useQueryClient();
  const isEditMode = !!clientId;

  const [formData, setFormData] = useState(() => {
    return {
      fullName: '',
      dateOfBirth: '',
      sex: '',
      race: '',
      middleInitial: '',
      address: '',
      driverLicense: '',
      localId: '',
      // Incident fields
      cadNumber: '',
      dateTimeArrested: '',
      locationArrested: '',
      agency: '',
      charge: '',
      justificationNarrative: '',
    };
  });

  // Fetch client data if editing by clientId
  const { data: clientResponse, isLoading: isLoadingClient } = useQuery({
    queryKey: ['clients', clientId],
    queryFn: () => Api.lesc.clients.get(clientId),
    enabled: isEditMode && !!clientId,
  });

  // Fetch hold data if accessed via holdId to check for existing client
  const { data: holdResponse, isLoading: isLoadingHold } = useQuery({
    queryKey: ['lesc-hold', holdId],
    queryFn: () => Api.lesc.holds.get(holdId),
    enabled: !isEditMode && !!holdId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Populate form with data when it becomes available (only if form is empty)
  useEffect(() => {
    if (isEditMode && clientResponse?.data && !formData.fullName) {
      const client = clientResponse.data;
      setFormData({
        fullName: `${client.firstName} ${client.lastName || ''}`.trim(),
        dateOfBirth: client.dateOfBirth ? client.dateOfBirth.split('T')[0] : '',
        sex: client.sex || '',
        race: client.race || '',
        middleInitial: client.middleInitial || '',
        address: client.address || '',
        driverLicense: client.driverLicense || '',
        localId: client.localId || '',
        // Incident fields - not available in client edit mode
        cadNumber: '',
        dateTimeArrested: '',
        locationArrested: '',
        agency: '',
        charge: '',
        justificationNarrative: '',
      });
    } else if (!isEditMode && holdResponse?.data && !formData.fullName) {
      const client = holdResponse.data.client;
      const incident = holdResponse.data.incident;
      setFormData({
        fullName: client ? `${client.firstName} ${client.lastName || ''}`.trim() : '',
        dateOfBirth: client?.dateOfBirth ? client.dateOfBirth.split('T')[0] : '',
        sex: client?.sex || '',
        race: client?.race || '',
        middleInitial: client?.middleInitial || '',
        address: client?.address || '',
        driverLicense: client?.driverLicense || '',
        localId: client?.localId || '',
        // Incident fields
        cadNumber: incident?.cadNumber || '',
        dateTimeArrested: incident?.dateTimeArrested ? new Date(incident.dateTimeArrested).toISOString().slice(0, 16) : '',
        locationArrested: incident?.locationArrested || '',
        agency: incident?.agency || '',
        charge: incident?.charge || '',
        justificationNarrative: holdResponse.data.notes || '',
      });
    }
  }, [isEditMode, clientResponse?.data?.id, holdResponse?.data?.client?.id, holdResponse?.data?.incident?.id]);

  const updateClientMutation = useMutation({
    mutationFn: (data) => {
      // Parse full name into first and last name
      const nameParts = data.fullName ? data.fullName.trim().split(/\s+/) : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

      return Api.lesc.clients.update(clientId, {
        firstName,
        lastName,
        dateOfBirth: data.dateOfBirth || null,
        sex: data.sex || null,
        race: data.race || null,
        middleInitial: data.middleInitial || null,
        address: data.address || null,
        driverLicense: data.driverLicense || null,
        localId: data.localId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', clientId] });
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
      navigate('/lesc/holds');
    },
    onError: (error) => {
      console.error('Failed to update client', error);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEditMode) {
      // Update existing client
      updateClientMutation.mutate(formData);
    } else {
      // Handle incident creation/update
      let incidentId = holdResponse?.data?.incident?.id || null;

      if (formData.cadNumber || formData.dateTimeArrested || formData.locationArrested || formData.agency || formData.charge) {
        // Create or update incident
        try {
          if (incidentId) {
            // Update existing incident
            await Api.lesc.incidents.update(incidentId, {
              cadNumber: formData.cadNumber || undefined,
              dateTimeArrested: formData.dateTimeArrested ? new Date(formData.dateTimeArrested).toISOString() : undefined,
              locationArrested: formData.locationArrested || null,
              agency: formData.agency || null,
              charge: formData.charge || undefined,
            });
          } else {
            // Create new incident
            const incidentResponse = await Api.lesc.incidents.create({
              cadNumber: formData.cadNumber || 'TBD',
              dateTimeArrested: formData.dateTimeArrested ? new Date(formData.dateTimeArrested).toISOString() : new Date().toISOString(),
              locationArrested: formData.locationArrested || null,
              agency: formData.agency || null,
              charge: formData.charge || '647(f) RWS',
            });
            incidentId = incidentResponse.data.id;
          }
        } catch (error) {
          console.error('Failed to create/update incident', error);
          // Continue with client update even if incident fails
        }
      }

      // Update hold notes and link to incident
      const currentNotes = holdResponse?.data?.notes || null;
      const currentIncidentId = holdResponse?.data?.incident?.id || null;
      const notesChanged = formData.justificationNarrative !== currentNotes;
      const incidentChanged = incidentId !== currentIncidentId;

      if (notesChanged || incidentChanged) {
        try {
          await Api.lesc.holds.update(holdId, {
            notes: formData.justificationNarrative !== undefined ? (formData.justificationNarrative || null) : undefined,
            incidentId: incidentChanged ? (incidentId || null) : undefined,
          });
        } catch (error) {
          console.error('Failed to update hold', error);
        }
      }

      // Check if hold has existing client
      const existingClientId = holdResponse?.data?.client?.id;

      if (existingClientId) {
        // Update existing client linked to hold
        try {
          // Parse full name into first and last name
          const nameParts = formData.fullName ? formData.fullName.trim().split(/\s+/) : [];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

          await Api.lesc.clients.update(existingClientId, {
            firstName,
            lastName,
            dateOfBirth: formData.dateOfBirth || null,
            sex: formData.sex || null,
            race: formData.race || null,
            middleInitial: formData.middleInitial || null,
            address: formData.address || null,
            driverLicense: formData.driverLicense || null,
            localId: formData.localId || null,
          });

          queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
          queryClient.invalidateQueries({ queryKey: ['lesc-hold', holdId] });
          queryClient.invalidateQueries({ queryKey: ['clients', existingClientId] });
          navigate('/lesc/holds');
        } catch (error) {
          console.error('Failed to update client', error);
        }
      } else {
        // Create new intake record
        try {
          await Api.lesc.intake.create({
            holdId,
            ...formData,
          });
          queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
          queryClient.invalidateQueries({ queryKey: ['lesc-hold', holdId] });
          navigate('/lesc/holds');
        } catch (error) {
          console.error('Failed to submit intake form', error);
          // Would show error message to user
        }
      }
    }
  };

  if ((isEditMode && isLoadingClient) || (!isEditMode && isLoadingHold)) {
    return (
      <Container>
        <Loader />
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
            {/* Subject Information */}
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
                Subject Information
              </Text>
              <TextInput
                label='Full Name (FN / LN)'
                placeholder='Enter full name'
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
                  },
                }}
              />
              <DateInput
                label='Date of Birth'
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              />
              <Select
                label='Sex'
                placeholder='Select sex'
                data={['Male', 'Female', 'Other']}
                value={formData.sex}
                onChange={(value) => setFormData(prev => ({ ...prev, sex: value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
                  },
                }}
              />
              <Select
                label='Race'
                placeholder='Select race'
                data={['White', 'Black', 'Hispanic', 'Asian', 'Other']}
                value={formData.race}
                onChange={(value) => setFormData(prev => ({ ...prev, race: value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
                  },
                }}
              />
              <TextInput
                label='Middle Initial'
                placeholder='Enter middle initial'
                value={formData.middleInitial}
                onChange={(e) => setFormData(prev => ({ ...prev, middleInitial: e.target.value }))}
                maxLength={1}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
                  },
                }}
              />
              <TextInput
                label='Address'
                placeholder='Enter address'
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
                  },
                }}
              />
              <TextInput
                label="Driver's License"
                placeholder="Enter driver's license number"
                value={formData.driverLicense}
                onChange={(e) => setFormData(prev => ({ ...prev, driverLicense: e.target.value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
                  },
                }}
              />
              <TextInput
                label='Local ID / SF #'
                placeholder='Enter local ID or SF number'
                value={formData.localId}
                onChange={(e) => setFormData(prev => ({ ...prev, localId: e.target.value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
                  },
                }}
              />
            </Stack>

            {/* Incident Information */}
            {!isEditMode && (
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
                  label='CAD Number'
                  placeholder='Enter CAD number'
                  value={formData.cadNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, cadNumber: e.target.value }))}
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
                <Textarea
                  label='647(f) RWS Justification - Narrative'
                  placeholder='Enter justification narrative'
                  value={formData.justificationNarrative}
                  onChange={(e) => setFormData(prev => ({ ...prev, justificationNarrative: e.target.value }))}
                  rows={4}
                  styles={{
                    input: {
                      fontSize: '16px', // Prevent iOS zoom
                    },
                  }}
                />
              </Stack>
            )}

            <Group justify='space-between' mt='md'>
              <Button variant='light' onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type='submit'>
                Submit
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}

export default IntakeForm;
