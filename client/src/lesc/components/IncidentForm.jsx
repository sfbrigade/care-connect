import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft, IconCurrentLocationFilled } from '@tabler/icons-react';
import { Box, Button, Container, Fieldset, Group, Loader, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useFacilityContext } from '@/FacilityContext';
import { formatAddress } from '@/utils/format';
import { getCurrentLocationAddress } from '@/utils/geocoding';

const initialValues = {
  cadNumber: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  arrestedAt: '',
  supervisorBadgeNumber: '',
};

function IncidentForm () {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const addressRef = useRef();

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    transformValues: values => ({
      ...values,
      arrestedAt: DateTime.fromISO(values.arrestedAt, { zone: 'local' }).toISO(),
    }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });

  useEffect(() => {
    if (!isLoading) {
      if (data) {
        let { arrestedAt } = data;
        arrestedAt = DateTime.fromISO(arrestedAt).toISO({ includeOffset: false, precision: 'seconds' });
        form.setInitialValues({
          ...data,
          arrestedAt,
        });
        form.reset();
        setInitialized(true);
      } else {
        const now = DateTime.now().toISO({ includeOffset: false, precision: 'seconds' });
        getCurrentLocationAddress().then(address => {
          form.setInitialValues({
            ...initialValues,
            ...address,
            facilityId: facility.id,
            arrestedAt: now,
          });
        }).catch(() => {
          form.setInitialValues({
            ...initialValues,
            facilityId: facility.id,
            arrestedAt: now,
          });
        }).finally(() => {
          form.reset();
          setInitialized(true);
        });
      }
    }
  }, [isLoading, data]);

  const onSubmitMutation = useMutation({
    mutationFn: (data) => data.id ? Api.incidents.update(data.id, data) : Api.incidents.create(data, { bedTypeId: searchParams.get('bedTypeId') }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ['facilities', facility.id, 'bed-types'],
      });
      await queryClient.setQueryData(['facilities', facility.id, 'active-incident'], response.data);
      navigate('/holds');
    },
  });

  return (
    <>
      <Head>
        <title>Incident Details</title>
      </Head>
      <Header>
        <Group>
          <IconButtonLink icon={IconArrowLeft} to='/holds' />
        </Group>
      </Header>
      <Container>
        <Text c='dimmed' size='xl'>Start an incident</Text>
        <Title order={3} mb='xl'>Enter these details once. We’ll reuse them for all holds in this incident.</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={!isInitialized} variant='unstyled'>
            <Stack gap='xl'>
              {!showAddressForm && (
                <TextInput
                  label='Arrest location'
                  rightSection={!isInitialized ? <Loader size={24} /> : <IconCurrentLocationFilled size={24} />}
                  value={formatAddress(form.getValues())}
                  readOnly
                  onFocus={() => { setShowAddressForm(true); setTimeout(() => addressRef.current?.focus(), 100); }}
                />
              )}
              {showAddressForm && (
                <>
                  <TextInput
                    ref={addressRef}
                    key={form.key('addressLine1')}
                    {...form.getInputProps('addressLine1')}
                    label='Arrest address line 1'
                    rightSection={<IconCurrentLocationFilled size={24} />}
                  />
                  <TextInput
                    key={form.key('addressLine2')}
                    {...form.getInputProps('addressLine2')}
                    label='Arrest address line 2'
                  />
                  <TextInput
                    key={form.key('city')}
                    {...form.getInputProps('city')}
                    label='Arrest city'
                  />
                  <Group wrap='nowrap'>
                    <TextInput
                      key={form.key('state')}
                      {...form.getInputProps('state')}
                      label='Arrest state'
                    />
                    <TextInput
                      key={form.key('postalCode')}
                      {...form.getInputProps('postalCode')}
                      label='Arrest ZIP code'
                    />
                  </Group>
                </>
              )}
              <TextInput
                key={form.key('arrestedAt')}
                {...form.getInputProps('arrestedAt')}
                label='Arrest date & time'
                type='datetime-local'
                onFocus={() => setShowAddressForm(false)}
              />
              <TextInput
                key={form.key('cadNumber')}
                {...form.getInputProps('cadNumber')}
                label='CAD number'
                onFocus={() => setShowAddressForm(false)}
              />
              <TextInput
                key={form.key('supervisorBadgeNumber')}
                {...form.getInputProps('supervisorBadgeNumber')}
                label='Supervising Sergeant’s Star Number'
                onFocus={() => setShowAddressForm(false)}
              />
              <Button type='submit'>
                {data?.id ? 'Save incident details' : 'Create incident & hold'}
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default IncidentForm;
