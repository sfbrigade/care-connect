import { useState, useEffect } from 'react';
import { Container, Stack, Text, Button, Group, Select, TextInput, Loader } from '@mantine/core';
import { useNavigate, useLocation, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft } from '@tabler/icons-react';
import Api from '../../../core/Api';

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
      });
    } else if (!isEditMode && holdResponse?.data?.client && !formData.fullName) {
      const client = holdResponse.data.client;
      setFormData({
        fullName: `${client.firstName} ${client.lastName || ''}`.trim(),
        dateOfBirth: client.dateOfBirth ? client.dateOfBirth.split('T')[0] : '',
        sex: client.sex || '',
        race: client.race || '',
      });
    }
  }, [isEditMode, clientResponse?.data?.id, holdResponse?.data?.client?.id]);

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
              />
              <TextInput
                label='Date of Birth'
                type='date'
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                styles={{
                  input: {
                    fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
                  },
                }}
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
            </Stack>

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
