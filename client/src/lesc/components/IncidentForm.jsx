import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft, IconCurrentLocationFilled } from '@tabler/icons-react';
import {
  Button,
  Container,
  Fieldset,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
  ActionIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import ChipInput from '@/components/ChipInput';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import { formatAddress } from '@/utils/format';
import { getCurrentLocationAddress } from '@/utils/geocoding';
import { validateIncident } from '@/utils/validators';

const initialValues = {
  cadNumber: '',
  caseNumber: '',
  encounteredVia: '',
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

function normalizeIncidentFormValues (values) {
  return {
    ...initialValues,
    ...values,
    cadNumber: values?.cadNumber ?? '',
    caseNumber: values?.caseNumber ?? '',
    encounteredVia: values?.encounteredVia ?? '',
    addressLine1: values?.addressLine1 ?? '',
    addressLine2: values?.addressLine2 ?? '',
    city: values?.city ?? '',
    state: values?.state ?? '',
    postalCode: values?.postalCode ?? '',
    latitude: values?.latitude ?? '',
    longitude: values?.longitude ?? '',
    arrestedAt: values?.arrestedAt ?? '',
    supervisorBadgeNumber: values?.supervisorBadgeNumber ?? '',
  };
}

function emptyStringToNull (value) {
  return value === '' ? null : value;
}

function buildIncidentPayload (values) {
  const arrestedAt = DateTime.fromISO(values.arrestedAt, {
    zone: 'local',
  });

  return {
    ...values,
    cadNumber: emptyStringToNull(values.cadNumber),
    caseNumber: emptyStringToNull(values.caseNumber),
    encounteredVia: emptyStringToNull(values.encounteredVia),
    addressLine1: emptyStringToNull(values.addressLine1),
    addressLine2: emptyStringToNull(values.addressLine2),
    city: emptyStringToNull(values.city),
    state: emptyStringToNull(values.state),
    postalCode: emptyStringToNull(values.postalCode),
    latitude: emptyStringToNull(values.latitude),
    longitude: emptyStringToNull(values.longitude),
    arrestedAt: arrestedAt.isValid ? arrestedAt.toISO() : null,
    supervisorBadgeNumber: emptyStringToNull(values.supervisorBadgeNumber),
  };
}

function normalizeCadNumber (value) {
  return String(value ?? '')
    .replace(/[^0-9a-z]/gi, '')
    .slice(0, 10);
}

function IncidentForm () {
  const navigate = useNavigate();
  const { id: incidentId } = useParams();
  const [searchParams] = useSearchParams();
  const initialNextPathRef = useRef(searchParams.get('next'));
  const nextPath = initialNextPathRef.current;
  const isConfirmIncidentFlow = !!nextPath;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { facility } = useFacilityContext();
  const { t } = useTranslation();
  const [isInitialized, setInitialized] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const addressRef = useRef();
  const autoGeolocationRequestedRef = useRef(false);
  const isEditing = !!incidentId;

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    transformValues: buildIncidentPayload,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['incidents', incidentId],
    queryFn: () => Api.incidents.get(incidentId).then(response => response.data),
    enabled: !!incidentId,
  });

  useEffect(() => {
    if (isEditing) {
      if (!isLoading && data) {
        let { arrestedAt } = data;
        arrestedAt = DateTime.fromISO(arrestedAt).toISO({
          includeOffset: false,
          precision: 'seconds',
        });
        form.initialize(normalizeIncidentFormValues({
          ...data,
          arrestedAt,
        }));
        if (!isConfirmIncidentFlow) {
          form.setErrors(validateIncident(data));
        }
        setInitialized(true);
        // If this is a brand-new incident, and the incident doesn't already have an address,
        // then try using device location to fill in the address/location data
        if (isConfirmIncidentFlow && !data.addressLine1 && !autoGeolocationRequestedRef.current) {
          autoGeolocationRequestedRef.current = true;
          getCurrentLocationAddress().then((address) => {
            if (address) {
              form.setValues(address);
            }
          });
        }
      }
    } else {
      const now = DateTime.now().toISO({
        includeOffset: false,
        precision: 'seconds',
      });
      getCurrentLocationAddress()
        .then((address) => {
          form.initialize({
            ...initialValues,
            ...address,
            facilityId: facility.id,
            arrestedAt: now,
          });
        })
        .catch(() => {
          form.initialize({
            ...initialValues,
            facilityId: facility.id,
            arrestedAt: now,
          });
        })
        .finally(() => {
          setInitialized(true);
        });
    }
  }, [isEditing, isLoading, data]);

  function LocationButton () {
    return (
      <ActionIcon onClick={getLocation} variant='transparent' aria-label='Use current location'>
        <IconCurrentLocationFilled size={24} style={{ color: 'gray' }} />
      </ActionIcon>
    );
  }
  const getLocation = () => {
    setInitialized(false);
    getCurrentLocationAddress().then((address) => {
      setInitialized(true);
      form.setValues({
        ...address,
      });
    });
  };

  const onSubmitMutation = useMutation({
    mutationFn: (formData) =>
      isEditing
        ? Api.incidents.update(incidentId, formData)
        : Api.incidents.create(formData, {
          bedTypeId: searchParams.get('bedTypeId'),
        }),
    onSuccess: async (response) => {
      const updatedIncident = response?.data;
      if (updatedIncident?.id != null) {
        queryClient.setQueryData(['incidents', String(updatedIncident.id)], updatedIncident);
      }
      await queryClient.invalidateQueries({
        queryKey: ['facilities', facility.id, 'bed-types'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['facilities', facility.id, 'my-holds'],
      });
      window.sessionStorage.setItem('_session-holds', 'active');
      navigate(nextPath || '/holds');
    },
    onError: () => {
      showToast('We couldn\'t save the incident', 'error', 4000, 'Something went wrong. Try again later.');
    },
  });

  const cadNumberInputProps = form.getInputProps('cadNumber');

  return (
    <>
      <Head>
        <title>Incident Details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to='/holds' aria-label='Go back' />
          {onSubmitMutation.isPending && (
            <Text c='dimmed' size='lg'>
              Saving...
            </Text>
          )}
          {onSubmitMutation.isSuccess && (
            <Text c='teal.6' size='lg'>
              Changes saved
            </Text>
          )}
        </Group>
      </Header>
      <Container>
        <Text c='dimmed' size='xl'>
          {isConfirmIncidentFlow ? 'First, confirm incident details' : 'Start an incident'}
        </Text>
        <Title order={3} mb='xl'>
          Enter these details once. They apply to all holds in this
          incident.
        </Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset
            disabled={!isInitialized || onSubmitMutation.isPending}
            variant='unstyled'
          >
            <Stack gap='xl'>
              {!showAddressForm && (
                <TextInput
                  data-testid='incident-arrest-location'
                  label={
                    <>
                      Arrest location<span>*</span>
                    </>
                  }
                  rightSection={
                    !isInitialized ? <Loader size={24} /> : <LocationButton />
                  }
                  value={formatAddress(form.getValues())}
                  readOnly
                  onFocus={() => {
                    setShowAddressForm(true);
                    setTimeout(() => addressRef.current?.focus(), 100);
                  }}
                />
              )}
              {showAddressForm && (
                <>
                  <AddressAutocomplete
                    data-testid='incident-address-line1'
                    ref={addressRef}
                    form={form}
                    field='addressLine1'
                    key={form.key('addressLine1')}
                    label={
                      <>
                        Arrest address line 1<span>*</span>
                      </>
                    }
                    rightSection={
                      !isInitialized ? <Loader size={24} /> : <LocationButton />
                    }
                  />
                  <TextInput
                    key={form.key('addressLine2')}
                    {...form.getInputProps('addressLine2')}
                    label='Arrest address line 2'
                  />
                  <TextInput
                    data-testid='incident-city'
                    key={form.key('city')}
                    {...form.getInputProps('city')}
                    label={
                      <>
                        Arrest city<span>*</span>
                      </>
                    }
                  />
                  <Group wrap='nowrap'>
                    <TextInput
                      data-testid='incident-state'
                      key={form.key('state')}
                      {...form.getInputProps('state')}
                      label={
                        <>
                          Arrest state<span>*</span>
                        </>
                      }
                    />
                    <TextInput
                      key={form.key('postalCode')}
                      {...form.getInputProps('postalCode')}
                      label='Arrest ZIP code'
                      type='number'
                      inputMode='numeric'
                    />
                  </Group>
                </>
              )}
              <TextInput
                key={form.key('arrestedAt')}
                {...form.getInputProps('arrestedAt')}
                label={
                  <>
                    Arrest date & time<span>*</span>
                  </>
                }
                type='datetime-local'
                onFocus={() => setShowAddressForm(false)}
              />
              <ChipInput
                data-testid='incident-encountered-via'
                {...form.getInputProps('encounteredVia')}
                key={form.key('encounteredVia')}
                label={<>Encountered via<span>*</span></>}
                options={['ON_VIEW', 'DISPATCHED'].map(value => ({
                  value,
                  label: t(`encounteredVia.${value}`),
                }))}
              />
              <Stack gap='xs'>
                <TextInput
                  data-testid='incident-cad'
                  key={form.key('cadNumber')}
                  {...cadNumberInputProps}
                  label={
                    <>
                      CAD number<span>*</span>
                    </>
                  }
                  placeholder='Enter CAD number'
                  type='text'
                  inputMode='text'
                  maxLength={10}
                  autoCapitalize='characters'
                  onChange={(event) => {
                    const normalized = normalizeCadNumber(
                      event.currentTarget.value
                    );
                    if (event.currentTarget.value !== normalized) {
                      event.currentTarget.value = normalized;
                    }
                    cadNumberInputProps.onChange(event);
                  }}
                  onFocus={() => setShowAddressForm(false)}
                />
                <Text size='md' c='gray.6'>
                  Obtain CAD number from dispatch.
                </Text>
              </Stack>
              <Stack gap='xs'>
                <TextInput
                  data-testid='incident-case'
                  key={form.key('caseNumber')}
                  {...form.getInputProps('caseNumber')}
                  label={
                    <>
                      Case number<span>*</span>
                    </>
                  }
                  placeholder='Enter case number'
                  type='text'
                  inputMode='text'
                  onFocus={() => setShowAddressForm(false)}
                />
                <Text size='md' c='gray.6'>
                  Obtain case number from dispatch.
                </Text>
              </Stack>
              <Stack gap='xs'>
                <TextInput
                  data-testid='incident-star'
                  key={form.key('supervisorBadgeNumber')}
                  {...form.getInputProps('supervisorBadgeNumber')}
                  label={<>Supervising Sergeant’s Star Number<span>*</span></>}
                  placeholder='Enter star number'
                  maxLength={4}
                  inputMode='numeric'
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace') {
                      e.preventDefault();
                    }
                  }}
                  onFocus={() => setShowAddressForm(false)}
                />
                <Text size='md' c='gray.6'>
                  Add Star Number before custody transfer.
                </Text>
              </Stack>
              <Button data-testid='incident-submit-btn' type='submit' style={{ alignSelf: 'flex-start' }}>
                {isConfirmIncidentFlow ? 'Continue to person details' : isEditing ? 'Save incident details' : 'Create incident & hold'}
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default IncidentForm;
