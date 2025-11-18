import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Title,
  Card,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Loader,
  Alert,
  Tabs,
  NumberInput,
  Select,
  Badge,
  Text,
  ActionIcon,
} from '@mantine/core';
import { IconAlertCircle, IconDeviceFloppy, IconPlus, IconX } from '@tabler/icons-react';

import Api from '../../Api';

function AdminFacilityDetail () {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    neighborhood: '',
    latitude: '',
    longitude: '',
    isActive: true,
  });

  const { data: facility, isLoading } = useQuery({
    queryKey: ['admin-facility', id],
    queryFn: async () => {
      const response = await Api.admin.facilities.get(id);
      return response.data;
    },
    enabled: !isNew,
  });

  const { data: availableServiceTypes } = useQuery({
    queryKey: ['service-types'],
    queryFn: async () => {
      const response = await Api.serviceTypes.list();
      return response.data;
    },
  });


  useEffect(() => {
    if (facility && !isNew) {
      setFormData({
        name: facility.name || '',
        description: facility.description || '',
        phone: facility.phone || '',
        email: facility.email || '',
        website: facility.website || '',
        addressLine1: facility.addressLine1 || '',
        addressLine2: facility.addressLine2 || '',
        city: facility.city || '',
        state: facility.state || '',
        postalCode: facility.postalCode || '',
        neighborhood: facility.neighborhood || '',
        latitude: facility.latitude?.toString() || '',
        longitude: facility.longitude?.toString() || '',
        isActive: facility.isActive ?? true,
      });
    }
  }, [facility, isNew]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (isNew) {
        return Api.admin.facilities.create(data);
      }
      return Api.admin.facilities.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-facilities'] });
      if (!isNew) {
        queryClient.invalidateQueries({ queryKey: ['admin-facility', id] });
      } else {
        navigate('/admin/facilities');
      }
    },
  });

  const updateBedsMutation = useMutation({
    mutationFn: ({ serviceTypeId, availableBeds, reservedBeds }) =>
      Api.admin.facilities.updateBeds(id, { serviceTypeId, availableBeds, reservedBeds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-facility', id] });
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: ({ serviceTypeId, availableBeds, reservedBeds }) =>
      Api.admin.facilities.addService(id, { serviceTypeId, availableBeds, reservedBeds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-facility', id] });
    },
  });

  const removeServiceMutation = useMutation({
    mutationFn: (serviceTypeId) =>
      Api.admin.facilities.removeService(id, serviceTypeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-facility', id] });
    },
  });

  const [newServiceTypeId, setNewServiceTypeId] = useState('');
  const [newServiceAvailableBeds, setNewServiceAvailableBeds] = useState(0);
  const [newServiceReservedBeds, setNewServiceReservedBeds] = useState(0);

  const handleAddService = () => {
    if (!newServiceTypeId) return;
    addServiceMutation.mutate({
      serviceTypeId: newServiceTypeId,
      availableBeds: newServiceAvailableBeds,
      reservedBeds: newServiceReservedBeds,
    });
    setNewServiceTypeId('');
    setNewServiceAvailableBeds(0);
    setNewServiceReservedBeds(0);
  };

  const handleRemoveService = (serviceTypeId) => {
    if (confirm('Are you sure you want to remove this service type from the facility?')) {
      removeServiceMutation.mutate(serviceTypeId);
    }
  };

  // Filter out service types that are already added
  const availableServiceTypesToAdd = availableServiceTypes?.filter(
    st => !facility?.services?.some(s => s.serviceTypeId === st.id)
  ) || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    };
    updateMutation.mutate(submitData);
  };

  if (!isNew && isLoading) {
    return (
      <Container>
        <Loader />
      </Container>
    );
  }

  return (
    <Container>
      <Title order={2} mb='md'>{isNew ? 'New Facility' : facility?.name}</Title>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue='details'>
          <Tabs.List>
            <Tabs.Tab value='details'>Details</Tabs.Tab>
            <Tabs.Tab value='services'>Services & Beds</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='details' pt='md'>
            <Stack>
              {!isNew && facility?.services && facility.services.length > 0 && (
                <div>
                  <Text size='sm' fw={500} mb='xs'>Service Types</Text>
                  <Group gap='xs'>
                    {facility.services.map((service) => (
                      <Badge key={service.serviceTypeId} size='lg' variant='light'>
                        {service.serviceTypeName} ({service.serviceTypeCode})
                      </Badge>
                    ))}
                  </Group>
                </div>
              )}

              {!isNew && (!facility?.services || facility.services.length === 0) && (
                <div>
                  <Text size='sm' fw={500} mb='xs'>Service Types</Text>
                  <Text size='sm' c='dimmed'>No service types configured. Add them in the Services & Beds tab.</Text>
                </div>
              )}

              <TextInput
                label='Name'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Textarea
                label='Description'
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
              <Group grow>
                <TextInput
                  label='Phone'
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <TextInput
                  label='Email'
                  type='email'
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Group>
              <TextInput
                label='Website'
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
              <TextInput
                label='Address Line 1'
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              />
              <TextInput
                label='Address Line 2'
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              />
              <Group grow>
                <TextInput
                  label='City'
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <TextInput
                  label='State'
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
                <TextInput
                  label='Postal Code'
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                />
              </Group>
              <TextInput
                label='Neighborhood'
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              />
              <Group grow>
                <NumberInput
                  label='Latitude'
                  value={formData.latitude ? parseFloat(formData.latitude) : null}
                  onChange={(value) => setFormData({ ...formData, latitude: value?.toString() || '' })}
                  decimalScale={6}
                />
                <NumberInput
                  label='Longitude'
                  value={formData.longitude ? parseFloat(formData.longitude) : null}
                  onChange={(value) => setFormData({ ...formData, longitude: value?.toString() || '' })}
                  decimalScale={6}
                />
              </Group>

              <Group mt='md'>
                <Button type='submit' leftSection={<IconDeviceFloppy />} loading={updateMutation.isPending}>
                  {isNew ? 'Create' : 'Save'}
                </Button>
                <Button variant='light' onClick={() => navigate('/admin/facilities')}>
                  Cancel
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value='services' pt='md'>
            {isNew ? (
              <Alert icon={<IconAlertCircle />} title='Create Facility First'>
                Please create the facility first, then you can add service types and configure bed counts.
              </Alert>
            ) : (
              <Stack>
                {facility?.services?.map((service) => (
                  <Card key={service.serviceTypeId} padding='md' withBorder>
                    <Group justify='space-between' mb='md'>
                      <div>
                        <Title order={4}>{service.serviceTypeName}</Title>
                        <Text size='sm' c='dimmed'>{service.serviceTypeCode}</Text>
                      </div>
                      <ActionIcon
                        color='red'
                        variant='light'
                        onClick={() => handleRemoveService(service.serviceTypeId)}
                        loading={removeServiceMutation.isPending}
                      >
                        <IconX size={18} />
                      </ActionIcon>
                    </Group>
                    <Group>
                      <NumberInput
                        label='Available Beds'
                        value={service.availableBeds ?? 0}
                        onChange={(value) => {
                          updateBedsMutation.mutate({
                            serviceTypeId: service.serviceTypeId,
                            availableBeds: value ?? 0,
                            reservedBeds: service.reservedBeds ?? 0,
                          });
                        }}
                        min={0}
                      />
                      <NumberInput
                        label='Reserved Beds'
                        value={service.reservedBeds ?? 0}
                        onChange={(value) => {
                          updateBedsMutation.mutate({
                            serviceTypeId: service.serviceTypeId,
                            availableBeds: service.availableBeds ?? 0,
                            reservedBeds: value ?? 0,
                          });
                        }}
                        min={0}
                      />
                    </Group>
                  </Card>
                ))}
                {(!facility?.services || facility.services.length === 0) && (
                  <Alert icon={<IconAlertCircle />}>
                    No services configured for this facility. Add a service type below.
                  </Alert>
                )}

                {availableServiceTypesToAdd.length > 0 && (
                  <Card padding='md' withBorder style={{ borderStyle: 'dashed' }}>
                    <Title order={4} mb='md'>Add Service Type</Title>
                    <Stack>
                      <Select
                        label='Service Type'
                        placeholder='Select a service type'
                        data={availableServiceTypesToAdd.map(st => ({
                          value: st.id,
                          label: `${st.name} (${st.code})`,
                        }))}
                        value={newServiceTypeId}
                        onChange={setNewServiceTypeId}
                        searchable
                      />
                      {newServiceTypeId && (
                        <Group>
                          <NumberInput
                            label='Available Beds'
                            value={newServiceAvailableBeds}
                            onChange={(value) => setNewServiceAvailableBeds(value ?? 0)}
                            min={0}
                          />
                          <NumberInput
                            label='Reserved Beds'
                            value={newServiceReservedBeds}
                            onChange={(value) => setNewServiceReservedBeds(value ?? 0)}
                            min={0}
                          />
                        </Group>
                      )}
                      <Button
                        leftSection={<IconPlus size={18} />}
                        onClick={handleAddService}
                        disabled={!newServiceTypeId}
                        loading={addServiceMutation.isPending}
                      >
                        Add Service Type
                      </Button>
                    </Stack>
                  </Card>
                )}
                {availableServiceTypesToAdd.length === 0 && facility?.services && facility.services.length > 0 && (
                  <Alert>
                    All available service types have been added to this facility.
                  </Alert>
                )}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </form>
    </Container>
  );
}

export default AdminFacilityDetail;

