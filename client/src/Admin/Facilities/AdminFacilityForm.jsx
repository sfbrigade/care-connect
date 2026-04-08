import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router';
import { Alert, Button, Checkbox, Container, Fieldset, Group, Select, Stack, TextInput, Textarea, Title } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminFacilityForm () {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const facilityId = params.facilityId;
  const isNew = !facilityId;

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      type: 'DIDO',
      serviceTypeId: '',
      subdomain: '',
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
      nstDistrict: '',
      latitude: '',
      longitude: '',
      isActive: true,
    },
    validate: {
      name: isNotEmpty('Name is required.'),
      type: isNotEmpty('Type is required.'),
      serviceTypeId: isNotEmpty('Service Type is required.'),
    },
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['facilities', facilityId],
    queryFn: () => Api.facilities.get(facilityId),
    enabled: !!facilityId,
  });

  const { data: serviceTypes } = useQuery({
    queryKey: ['serviceTypes'],
    queryFn: () => Api.serviceTypes.list().then(res => res.data),
  });

  useEffect(() => {
    if (response) {
      form.initialize(response.data);
    }
  }, [response]);

  const onSubmitMutation = useMutation({
    mutationFn: (values) => {
      if (isNew) {
        return Api.facilities.create(values);
      } else {
        return Api.facilities.update(facilityId, values);
      }
    },
    onMutate: () => setSuccess(false),
    onSuccess: () => {
      setSuccess(true);
      if (isNew) {
        navigate('/admin/facilities');
      }
    },
    onError: (errors) => form.setErrors(errors),
    onSettled: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });
  const [success, setSuccess] = useState(false);

  function handleCancel () {
    navigate(-1);
  }

  return (
    <>
      <Head>
        <title>{isNew ? 'New Facility' : 'Edit Facility'}</title>
      </Head>
      <Container>
        <Title mb='md'>{isNew ? 'New Facility' : 'Edit Facility'}</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading} variant='unstyled'>
            <Stack>
              {location.state?.flash && <Alert>{location.state?.flash}</Alert>}
              {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}
              {success && <Alert>Facility has been {isNew ? 'created' : 'updated'}!</Alert>}

              <TextInput
                {...form.getInputProps('name')}
                key={form.key('name')}
                label='Name'
                placeholder='e.g. Navigation Center'
                required
              />

              <Group grow>
                <Select
                  {...form.getInputProps('type')}
                  key={form.key('type')}
                  label='Type'
                  data={[
                    { value: 'DIDO', label: 'DIDO' },
                    { value: 'LESC', label: 'LESC' },
                  ]}
                  required
                />
                <Select
                  {...form.getInputProps('serviceTypeId')}
                  key={form.key('serviceTypeId')}
                  label='Service Type'
                  data={serviceTypes?.map(st => ({ value: st.id, label: st.name })) || []}
                  required
                />
              </Group>

              <TextInput
                {...form.getInputProps('subdomain')}
                key={form.key('subdomain')}
                label='Subdomain'
                placeholder='e.g. nav-center'
              />

              <Textarea
                {...form.getInputProps('description')}
                key={form.key('description')}
                label='Description'
                placeholder='Describe the facility...'
              />

              <Group grow>
                <TextInput
                  {...form.getInputProps('phone')}
                  key={form.key('phone')}
                  label='Phone'
                  placeholder='(415) 684-1902'
                />
                <TextInput
                  {...form.getInputProps('email')}
                  key={form.key('email')}
                  label='Email'
                  placeholder='contact@facility.org'
                />
              </Group>

              <TextInput
                {...form.getInputProps('website')}
                key={form.key('website')}
                label='Website'
                placeholder='https://...'
              />

              <TextInput
                {...form.getInputProps('addressLine1')}
                key={form.key('addressLine1')}
                label='Address Line 1'
              />
              <TextInput
                {...form.getInputProps('addressLine2')}
                key={form.key('addressLine2')}
                label='Address Line 2'
              />

              <Group grow>
                <TextInput
                  {...form.getInputProps('city')}
                  key={form.key('city')}
                  label='City'
                />
                <TextInput
                  {...form.getInputProps('state')}
                  key={form.key('state')}
                  label='State'
                />
                <TextInput
                  {...form.getInputProps('postalCode')}
                  key={form.key('postalCode')}
                  label='Postal Code'
                />
              </Group>

              <Group grow>
                <TextInput
                  {...form.getInputProps('neighborhood')}
                  key={form.key('neighborhood')}
                  label='Neighborhood'
                />
                <TextInput
                  {...form.getInputProps('nstDistrict')}
                  key={form.key('nstDistrict')}
                  label='NST District'
                />
              </Group>

              <Group grow>
                <TextInput
                  {...form.getInputProps('latitude')}
                  key={form.key('latitude')}
                  label='Latitude'
                  type='number'
                  step='any'
                />
                <TextInput
                  {...form.getInputProps('longitude')}
                  key={form.key('longitude')}
                  label='Longitude'
                  type='number'
                  step='any'
                />
              </Group>

              <Checkbox
                {...form.getInputProps('isActive', { type: 'checkbox' })}
                key={form.key('isActive')}
                label='Is Active'
              />

              <Group>
                <Button disabled={onSubmitMutation.isPending} type='submit'>Submit</Button>
                <Button
                  variant='light'
                  onClick={handleCancel}
                  disabled={onSubmitMutation.isPending}
                >
                  Cancel
                </Button>
              </Group>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default AdminFacilityForm;
