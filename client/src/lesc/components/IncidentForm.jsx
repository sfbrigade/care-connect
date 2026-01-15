import { useEffect, useRef, useState } from 'react';
import { Head } from '@unhead/react';
import { IconArrowLeft, IconCurrentLocationFilled } from '@tabler/icons-react';
import { Box, Button, Container, Fieldset, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';

import Api from '@/Api';
import IconButtonLink from '@/components/IconButtonLink';
import { useFacilityContext } from '@/FacilityContext';
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
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const addressRef = useRef();
  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
  });
  const { data, isLoading } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });
  useEffect(() => {
    if (!isLoading) {
      if (data) {
        form.setInitialValues(data);
        form.reset();
        setInitialized(true);
      } else {
        getCurrentLocationAddress().then(address => {
          form.setInitialValues({
            ...initialValues,
            ...address,
            arrestedAt: DateTime.now().toISO({ includeOffset: false, precision: 'seconds' }),
          });
          form.reset();
        }).finally(() => {
          setInitialized(true);
        });
      }
    }
  }, [isLoading, data]);
  function formatAddress () {
    return `${form.values.addressLine1}${form.values.addressLine2 ? `, ${form.values.addressLine2}` : ''}${form.values.city ? `, ${form.values.city}` : ''}${form.values.state ? `, ${form.values.state}` : ''}${form.values.postalCode ? ` ${form.values.postalCode}` : ''}`;
  }
  return (
    <>
      <Head>
        <title>Incident Details</title>
      </Head>
      <Container>
        <Box mb='xl'>
          <IconButtonLink icon={IconArrowLeft} to='/holds' />
        </Box>
        <Text c='dimmed' size='xl'>Start an incident</Text>
        <Title order={3} mb='xl'>Enter these details once. We’ll reuse them for all holds in this incident.</Title>
        <form>
          <Fieldset disabled={!isInitialized} variant='unstyled'>
            <Stack gap='xl'>
              {!showAddressForm && (
                <TextInput
                  label='Arrest location'
                  rightSection={<IconCurrentLocationFilled size={24} />}
                  value={formatAddress()}
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
                      label='Arrest postal code'
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
              <Button type='submit'>Create incident & hold</Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default IncidentForm;
