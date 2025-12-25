import { useState, useEffect } from 'react';
import { Container, Stack, Text, Button, Group, Select, TextInput, Loader, NumberInput } from '@mantine/core';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft } from '@tabler/icons-react';
import Api from '@/Api';
import { useToast } from '@/components/ToastContext';

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
 * Client View component - for viewing and editing client information
 */
function ClientView () {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

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
    };
  });

  // Fetch client data
  const { data: clientResponse, isLoading: isLoadingClient } = useQuery({
    queryKey: ['clients', clientId],
    queryFn: () => Api.lesc.clients.get(clientId),
    enabled: !!clientId,
  });

  // Fetch holds to get list of clients (for list view)
  const { data: holdsResponse, isLoading: isLoadingHolds } = useQuery({
    queryKey: ['lesc-holds'],
    queryFn: async () => {
      const response = await Api.lesc.holds.list();
      return response.data;
    },
    enabled: !clientId,
  });

  // Populate form with data when it becomes available
  useEffect(() => {
    if (clientResponse?.data && !formData.fullName) {
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
      });
    }
  }, [clientResponse?.data?.id]);

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
      showToast('Client updated successfully', 'success');
    },
    onError: (error) => {
      console.error('Failed to update client', error);
      showToast('Failed to update client', 'error');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) return;
    updateClientMutation.mutate(formData);
  };

  // If no clientId, show list of clients from holds
  if (!clientId) {
    if (isLoadingHolds) {
      return (
        <Container>
          <Loader />
        </Container>
      );
    }

    const clients = holdsResponse
      ?.map(hold => hold.client)
      .filter(Boolean)
      .filter((client, index, self) =>
        index === self.findIndex(c => c.id === client.id)
      ) || [];

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
            Clients
          </Text>
          {clients.length === 0
            ? (
              <Text>No clients found</Text>
              )
            : (
              <Stack gap='sm'>
                {clients.map((client) => {
                  const fullName = `${client.firstName} ${client.lastName || ''}`.trim();
                  return (
                    <Button
                      key={client.id}
                      variant='light'
                      fullWidth
                      onClick={() => navigate(`/client/${client.id}`)}
                      style={{ justifyContent: 'flex-start', height: 'auto', padding: '12px' }}
                    >
                      <Stack gap={4} style={{ width: '100%', textAlign: 'left' }}>
                        <Text fw={500}>{fullName || 'Unnamed Client'}</Text>
                        {client.dateOfBirth && (
                          <Text size='sm' c='dimmed'>
                            DOB: {new Date(client.dateOfBirth).toLocaleDateString()}
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

  if (isLoadingClient) {
    return (
      <Container>
        <Loader />
      </Container>
    );
  }

  if (!clientResponse?.data) {
    return (
      <Container>
        <Stack gap='md'>
          <Button
            leftSection={<IconArrowLeft size={18} />}
            variant='light'
            onClick={() => navigate('/client')}
            style={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>
          <Text>Client not found</Text>
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
            {/* Client Information */}
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
                Client Information
              </Text>
              <TextInput
                label='Client ID'
                value={clientResponse?.data?.id || ''}
                readOnly
                styles={{
                  input: {
                    fontSize: '16px',
                    backgroundColor: '#f5f5f5',
                  },
                }}
              />
              <TextInput
                label='Full Name (FN / LN)'
                placeholder='Enter full name'
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom
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
                    fontSize: '16px', // Prevent iOS zoom
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
                    fontSize: '16px', // Prevent iOS zoom
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

            <Group justify='flex-end' mt='md'>
              <Button type='submit' loading={updateClientMutation.isPending}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}

export default ClientView;
