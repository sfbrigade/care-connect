import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
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

import Api from '@/Api';
import CancelIncidentModal from './CancelIncidentModal';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import { formatAddress } from '@/utils/format';
import { getCurrentLocationAddress } from '@/utils/geocoding';
import { hasMeaningfulHoldData } from './holdDataUtils';

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

function normalizeCadNumber (value) {
  return String(value ?? '')
    .replace(/[^0-9a-z]/gi, '')
    .slice(0, 10);
}

function IncidentForm () {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const addressRef = useRef();

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    transformValues: (values) => ({
      ...values,
      arrestedAt: DateTime.fromISO(values.arrestedAt, {
        zone: 'local',
      }).toISO(),
    }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () =>
      Api.facilities
        .activeIncident(facility.id)
        .then((response) => response.data),
  });

  const { data: incidentDeflections, isFetching: isFetchingIncidentDeflections } = useQuery({
    queryKey: ['deflections', data?.id, 'all'],
    queryFn: () => Api.deflections.list({ incidentId: data.id }).then(response => response.data),
    enabled: !!data?.id,
  });

  useEffect(() => {
    if (!isLoading) {
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
          })
          .catch(() => {
            form.setInitialValues({
              ...initialValues,
              facilityId: facility.id,
              arrestedAt: now,
            });
          })
          .finally(() => {
            form.reset();
            setInitialized(true);
          });
      }
    }
  }, [isLoading, data]);

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
      await queryClient.invalidateQueries({
        queryKey: ['facilities', facility.id, 'bed-types'],
      });
      await queryClient.setQueryData(
        ['facilities', facility.id, 'active-incident'],
        response.data
      );
      navigate('/holds');
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
      await queryClient.removeQueries({
        queryKey: ['deflections', data?.id, 'all'],
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
  const incidentHasDetailedHolds = !!incidentDeflections?.some(deflection => hasMeaningfulHoldData(deflection));

  const cadNumberInputProps = form.getInputProps('cadNumber');

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
            disabled={!isInitialized || !onSubmitMutation.isIdle}
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
                  <TextInput
                    ref={addressRef}
                    key={form.key('addressLine1')}
                    {...form.getInputProps('addressLine1')}
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
                    label={
                      <>
                        Arrest city<span>*</span>
                      </>
                    }
                  />
                  <Group wrap='nowrap'>
                    <TextInput
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
              <Stack gap='xs'>
                <TextInput
                  key={form.key('cadNumber')}
                  {...cadNumberInputProps}
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
                  label={
                    <>
                      Supervising Sergeant’s Star Number<span>*</span>
                    </>
                  }
                  minLength={1}
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
