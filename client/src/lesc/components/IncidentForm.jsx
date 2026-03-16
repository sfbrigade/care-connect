import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft, IconCurrentLocationFilled } from '@tabler/icons-react';
import {
  Button,
  Chip,
  Container,
  Fieldset,
  Group,
  Input,
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

import Api from '@/Api';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import CancelIncidentModal from './CancelIncidentModal';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import { formatAddress } from '@/utils/format';
import { getCurrentLocationAddress } from '@/utils/geocoding';

const requiredFieldError = 'This field is required';
const requiredChipError = 'Select one';
const INCIDENT_DRAFT_HINTS_KEY = '_session-incident-details-hints-draft';

const initialValues = {
  cadNumber: '',
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

function normalizeCadNumber (value) {
  return String(value ?? '')
    .replace(/[^0-9a-z]/gi, '')
    .slice(0, 10);
}

function isBlank (value) {
  return !String(value ?? '').trim();
}

function getMissingChipStyles (isMissing) {
  if (!isMissing) return undefined;

  return {
    label: {
      backgroundColor: 'var(--mantine-color-red-0)',
      borderColor: 'transparent',
    },
  };
}

function getRequiredTextInputStyles (isMissing) {
  if (!isMissing) return undefined;

  return {
    input: {
      borderColor: 'var(--mantine-color-red-6)',
      '&::placeholder': {
        color: 'var(--mantine-color-red-6)',
      },
    },
    error: {
      color: 'var(--mantine-color-red-6)',
    },
  };
}

function getMissingRequiredFields (values) {
  return {
    arrestLocation: isBlank(values.addressLine1) || isBlank(values.city) || isBlank(values.state),
    addressLine1: isBlank(values.addressLine1),
    city: isBlank(values.city),
    state: isBlank(values.state),
    encounteredVia: isBlank(values.encounteredVia),
    cadNumber: isBlank(values.cadNumber),
    supervisorBadgeNumber: isBlank(values.supervisorBadgeNumber),
  };
}

function hasAnyEnteredIncidentRequiredField (values) {
  return !(
    isBlank(values.addressLine1) &&
    isBlank(values.city) &&
    isBlank(values.state) &&
    isBlank(values.encounteredVia) &&
    isBlank(values.cadNumber) &&
    isBlank(values.supervisorBadgeNumber)
  );
}

function getIncidentHintsStorageKey (incidentId) {
  return incidentId
    ? `_session-incident-details-hints-${incidentId}`
    : INCIDENT_DRAFT_HINTS_KEY;
}

function IncidentForm () {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewParam = searchParams.get('isNew') === 'true';
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [missingRequiredFields, setMissingRequiredFields] = useState(
    getMissingRequiredFields(initialValues)
  );
  const [shouldShowIncompleteHints, setShouldShowIncompleteHints] = useState(
    window.sessionStorage.getItem(INCIDENT_DRAFT_HINTS_KEY) === 'true'
  );
  const addressRef = useRef();
  const missingRequiredFieldsRef = useRef(missingRequiredFields);
  const hintsStorageKeyRef = useRef(INCIDENT_DRAFT_HINTS_KEY);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    transformValues: values => ({
      ...values,
      arrestedAt: DateTime.fromISO(values.arrestedAt, {
        zone: 'local',
      }).toISO(),
    }),
    onValuesChange: (values) => {
      setMissingRequiredFields(getMissingRequiredFields(values));
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () =>
      Api.facilities
        .activeIncident(facility.id)
        .then((response) => response.data),
  });

  const { data: incidentDeflections, isFetching: isFetchingIncidentDeflections } = useQuery({
    queryKey: ['deflections', data?.id, 'active'],
    queryFn: () => Api.deflections.list({ incidentId: data.id }).then(response => response.data),
    enabled: !!data?.id,
  });

  useEffect(() => {
    if (!isLoading) {
      const hintsStorageKey = getIncidentHintsStorageKey(data?.id);
      hintsStorageKeyRef.current = hintsStorageKey;
      const normalizedArrestedAt = data?.arrestedAt
        ? DateTime.fromISO(data.arrestedAt).toISO({
          includeOffset: false,
          precision: 'seconds',
        })
        : '';
      const existingIncidentShouldShowHints = !!data &&
        hasAnyEnteredIncidentRequiredField(data) &&
        Object.values(getMissingRequiredFields({
          ...initialValues,
          ...data,
          arrestedAt: normalizedArrestedAt,
        })).some(Boolean);
      setShouldShowIncompleteHints(
        !isNewParam && (window.sessionStorage.getItem(hintsStorageKey) === 'true' || existingIncidentShouldShowHints)
      );
      if (data) {
        let { arrestedAt } = data;
        arrestedAt = DateTime.fromISO(arrestedAt).toISO({
          includeOffset: false,
          precision: 'seconds',
        });
        form.setInitialValues({
          ...data,
          arrestedAt,
        });
        form.reset();
        setMissingRequiredFields(getMissingRequiredFields({
          ...data,
          arrestedAt,
        }));
        setInitialized(true);
      } else {
        const now = DateTime.now().toISO({
          includeOffset: false,
          precision: 'seconds',
        });
        getCurrentLocationAddress()
          .then((address) => {
            form.setInitialValues({
              ...initialValues,
              ...address,
              facilityId: facility.id,
              arrestedAt: now,
            });
            setMissingRequiredFields(getMissingRequiredFields({
              ...initialValues,
              ...address,
              facilityId: facility.id,
              arrestedAt: now,
            }));
          })
          .catch(() => {
            form.setInitialValues({
              ...initialValues,
              facilityId: facility.id,
              arrestedAt: now,
            });
            setMissingRequiredFields(getMissingRequiredFields({
              ...initialValues,
              facilityId: facility.id,
              arrestedAt: now,
            }));
          })
          .finally(() => {
            form.reset();
            setInitialized(true);
          });
      }
    }
  }, [isLoading, data, isNewParam]);

  useEffect(() => {
    missingRequiredFieldsRef.current = missingRequiredFields;
  }, [missingRequiredFields]);

  useEffect(() => () => {
    const hasMissingRequiredFields = Object.values(missingRequiredFieldsRef.current).some(Boolean);
    if (hasMissingRequiredFields) {
      window.sessionStorage.setItem(hintsStorageKeyRef.current, 'true');
      return;
    }

    window.sessionStorage.removeItem(hintsStorageKeyRef.current);
    if (hintsStorageKeyRef.current !== INCIDENT_DRAFT_HINTS_KEY) {
      window.sessionStorage.removeItem(INCIDENT_DRAFT_HINTS_KEY);
    }
  }, []);

  function LocationButton () {
    return (
      <ActionIcon onClick={getLocation} variant='transparent'>
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
      setMissingRequiredFields(getMissingRequiredFields({
        ...form.getValues(),
        ...address,
      }));
    });
  };

  const onSubmitMutation = useMutation({
    mutationFn: (data) =>
      data.id
        ? Api.incidents.update(data.id, data)
        : Api.incidents.create(data, {
          bedTypeId: searchParams.get('bedTypeId'),
        }),
    onSuccess: async (response) => {
      hintsStorageKeyRef.current = getIncidentHintsStorageKey(response.data.id);
      window.sessionStorage.removeItem(INCIDENT_DRAFT_HINTS_KEY);
      await queryClient.invalidateQueries({
        queryKey: ['facilities', facility.id, 'bed-types'],
      });
      await queryClient.setQueryData(
        ['facilities', facility.id, 'active-incident'],
        response.data
      );
      navigate('/holds');
    },
    onError: () => {
      showToast('We couldn’t create the incident', 'error', 4000, 'Something went wrong. Try again later.');
    },
  });

  const cancelIncidentMutation = useMutation({
    mutationFn: ({ id, cancelReasonId }) => Api.incidents.cancel(id, { cancelReasonId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['facilities', facility.id, 'bed-types'],
      });
      await queryClient.setQueryData(
        ['facilities', facility.id, 'active-incident'],
        null
      );
      await queryClient.removeQueries({
        queryKey: ['deflections', data?.id, 'active'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['deflections', facility.id, 'inactive'],
      });
      setShowCancelModal(false);
      showToast('Incident canceled', 'success', 4000, 'Any chairs have been released. Ready for new incident.');
      navigate('/holds');
    },
    onError: (error) => {
      const isNetworkError = !error?.response;

      if (isNetworkError) {
        showToast('Connection failure', 'warning', 4000, 'Failed to cancel incident. Check your connection and try again.');
        return;
      }

      showToast('We couldn’t cancel the incident', 'error', 4000, 'Something went wrong. Try again later.');
    },
  });

  async function onCancelIncidentConfirmed (cancelReasonId) {
    if (data?.id) {
      await cancelIncidentMutation.mutateAsync({ id: data.id, cancelReasonId });
    }
  }

  const canCancelIncident = !!data?.id && !isFetchingIncidentDeflections;
  const incidentHasDetailedHolds = !!incidentDeflections?.some(deflection => deflection.subjectId);

  const cadNumberInputProps = form.getInputProps('cadNumber');

  function getRequiredTextInputProps (field, missingPlaceholder, defaultPlaceholder = missingPlaceholder) {
    const isMissing = shouldShowIncompleteHints && missingRequiredFields[field];
    return {
      placeholder: isMissing ? missingPlaceholder : defaultPlaceholder,
      error: isMissing ? requiredFieldError : undefined,
      styles: getRequiredTextInputStyles(isMissing),
    };
  }

  return (
    <>
      <Head>
        <title>Incident Details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to='/holds' />
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
          Start an incident
        </Text>
        <Title order={3} mb='xl'>
          Enter these details once. We’ll reuse them for all holds in this
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
                  label={
                    <>
                      Arrest location<span>*</span>
                    </>
                  }
                  {...getRequiredTextInputProps('arrestLocation', 'Enter arrest location')}
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
                    ref={addressRef}
                    form={form}
                    field='addressLine1'
                    key={form.key('addressLine1')}
                    {...getRequiredTextInputProps('addressLine1', 'Enter arrest address')}
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
                    key={form.key('city')}
                    {...form.getInputProps('city')}
                    {...getRequiredTextInputProps('city', 'Enter arrest city')}
                    label={
                      <>
                        Arrest city<span>*</span>
                      </>
                    }
                  />
                  <Group wrap='nowrap' align='flex-start'>
                    <TextInput
                      key={form.key('state')}
                      {...form.getInputProps('state')}
                      {...getRequiredTextInputProps('state', 'Enter arrest state')}
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
                styles={{
                  input: {
                    color: 'var(--mantine-color-black)',
                    WebkitTextFillColor: 'var(--mantine-color-black)',
                    opacity: 1,
                    '&::-webkit-datetime-edit': {
                      color: 'var(--mantine-color-black)',
                      WebkitTextFillColor: 'var(--mantine-color-black)',
                    },
                    '&::-webkit-datetime-edit-fields-wrapper': {
                      color: 'var(--mantine-color-black)',
                      WebkitTextFillColor: 'var(--mantine-color-black)',
                    },
                    '&::-webkit-datetime-edit-text': {
                      color: 'var(--mantine-color-black)',
                      WebkitTextFillColor: 'var(--mantine-color-black)',
                    },
                    '&::-webkit-datetime-edit-month-field': {
                      color: 'var(--mantine-color-black)',
                      WebkitTextFillColor: 'var(--mantine-color-black)',
                    },
                    '&::-webkit-datetime-edit-day-field': {
                      color: 'var(--mantine-color-black)',
                      WebkitTextFillColor: 'var(--mantine-color-black)',
                    },
                    '&::-webkit-datetime-edit-year-field': {
                      color: 'var(--mantine-color-black)',
                      WebkitTextFillColor: 'var(--mantine-color-black)',
                    },
                    '&::-webkit-datetime-edit-hour-field': {
                      color: 'var(--mantine-color-black)',
                      WebkitTextFillColor: 'var(--mantine-color-black)',
                    },
                    '&::-webkit-datetime-edit-minute-field': {
                      color: 'var(--mantine-color-black)',
                      WebkitTextFillColor: 'var(--mantine-color-black)',
                    },
                    '&::-webkit-datetime-edit-ampm-field': {
                      color: 'var(--mantine-color-black)',
                      WebkitTextFillColor: 'var(--mantine-color-black)',
                    },
                  },
                }}
                onFocus={() => setShowAddressForm(false)}
              />
              <Input.Wrapper
                label={<>Encountered via<span>*</span></>}
                error={shouldShowIncompleteHints && missingRequiredFields.encounteredVia ? requiredChipError : undefined}
              >
                <Chip.Group
                  key={form.key('encounteredVia')}
                  {...form.getInputProps('encounteredVia')}
                >
                  <Group gap='sm' mt='md'>
                    <Chip value='ON_VIEW' styles={getMissingChipStyles(shouldShowIncompleteHints && missingRequiredFields.encounteredVia)}>On view</Chip>
                    <Chip value='DISPATCHED' styles={getMissingChipStyles(shouldShowIncompleteHints && missingRequiredFields.encounteredVia)}>Dispatched</Chip>
                  </Group>
                </Chip.Group>
              </Input.Wrapper>
              <Stack gap='xs'>
                <TextInput
                  key={form.key('cadNumber')}
                  {...cadNumberInputProps}
                  {...getRequiredTextInputProps('cadNumber', 'Enter CAD number')}
                  label={
                    <>
                      CAD number<span>*</span>
                    </>
                  }
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
                  CAD is provided by dispatch (MDT / radio).
                </Text>
              </Stack>
              <Stack gap='xs'>
                <TextInput
                  key={form.key('supervisorBadgeNumber')}
                  {...form.getInputProps('supervisorBadgeNumber')}
                  {...getRequiredTextInputProps('supervisorBadgeNumber', 'Enter supervising sergeant star number')}
                  label={<>Supervising Sergeant’s Star Number<span>*</span></>}
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
                  If you don't have the Star Number right now, you must come
                  back and add it before custody transfer.
                </Text>
              </Stack>
              <Stack gap='sm'>
                <Button type='submit' style={{ alignSelf: 'flex-start' }}>
                  {data?.id ? 'Save incident details' : 'Create incident & hold'}
                </Button>
                {canCancelIncident && (
                  <Button
                    type='button'
                    variant='destructive'
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => setShowCancelModal(true)}
                    disabled={cancelIncidentMutation.isPending}
                  >
                    Cancel incident
                  </Button>
                )}
              </Stack>
            </Stack>
          </Fieldset>
        </form>
      </Container>
      <CancelIncidentModal
        opened={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={onCancelIncidentConfirmed}
        requiresReason={incidentHasDetailedHolds}
        loading={cancelIncidentMutation.isPending}
      />
    </>
  );
}

export default IncidentForm;
