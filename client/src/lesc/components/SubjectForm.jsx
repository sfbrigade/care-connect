import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Accordion, Button, Chip, Container, Divider, Fieldset, Group, Input, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import AddressAutocomplete from '@/components/AddressAutocomplete';
import Api from '@/Api';
import BooleanInput from '@/components/BooleanInput';
import ChipInput from '@/components/ChipInput';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import { formatInputDob } from '@/utils/format';
import { getDateOfBirthInputError, validateSubjectFormValues } from '@/utils/validators';

import { DRUG_TYPE_OPTIONS } from '../constants/drugTypeOptions';
import File647fModal from './custody/File647fModal';

const initialValues = {
  firstName: '',
  lastName: '',
  middleInitial: '',
  dateOfBirth: '',
  sex: '',
  race: '',
  driverLicense: '',
  localId: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  narcoticsSubstance: null,
  narcoticsParaphernalia: null,
  drugUseEvidence: null,
  drugType: null,
};

function SubjectForm () {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const isCustodyContext = location.pathname.startsWith('/custody');
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { t } = useTranslation();
  const [dobInput, setDobInput] = useState('');
  const [showFile647fModal, setShowFile647fModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [showDrugTypeQuestion, setShowDrugTypeQuestion] = useState(false);
  const { showToast } = useToast();
  const autoSaveTimerRef = useRef(null);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    onValuesChange: (values) => {
      setShowDrugTypeQuestion(values.drugUseEvidence);
      if (form.initialized && !isCustodyContext) {
        scheduleAutoSave(values, dobInput);
      }
    }
  });

  const { data: incident } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });

  const { data: deflection, isLoading } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  useEffect(() => {
    if (!isLoading && !form.initialized) {
      if (deflection?.subject) {
        const normalized = normalizeValues({
          ...initialValues,
          ...deflection.subject,
          narcoticsSubstance: deflection.narcoticsSubstance,
          narcoticsParaphernalia: deflection.narcoticsParaphernalia,
          drugUseEvidence: deflection.drugUseEvidence,
          drugType: deflection.drugType ?? null,
          dateOfBirth: deflection.subject.dateOfBirth ? DateTime.fromISO(deflection.subject.dateOfBirth, { setZone: true }).toFormat('MM/dd/yyyy') : '',
        });
        setDobInput(normalized.dateOfBirth ?? '');
        form.initialize(normalized);
        if (!isNew) {
          const errors = validateSubjectFormValues(normalized, normalized.dateOfBirth);
          form.setErrors(errors);
        }
      } else {
        form.initialize(initialValues);
      }
    }
  }, [isLoading, deflection, form.initialized]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  }, []);

  function normalizeValues (values) {
    return {
      ...initialValues,
      ...values,
      drugType: values.drugType ?? null,
      dateOfBirth: values.dateOfBirth ?? '',
    };
  }

  function buildAutoSavePayload (values, dobString) {
    const normalized = normalizeValues(values);
    const parsedDob = DateTime.fromFormat((dobString ?? '').trim(), 'MM/dd/yyyy', { zone: 'local' });
    const payload = {
      ...normalized,
      drugType: normalized.drugUseEvidence ? normalized.drugType ?? null : null,
    };

    const dobValue = String(dobString ?? '').trim();
    if (!dobValue) {
      payload.dateOfBirth = null;
    } else if (parsedDob.isValid) {
      payload.dateOfBirth = parsedDob.toISO();
    }

    return payload;
  }

  function buildSubmitPayload (values, dobString) {
    const normalized = normalizeValues(values);
    const parsedDob = DateTime.fromFormat((dobString ?? '').trim(), 'MM/dd/yyyy', { zone: 'local' });
    return {
      ...normalized,
      drugType: normalized.drugUseEvidence ? normalized.drugType ?? null : null,
      dateOfBirth: parsedDob.isValid ? parsedDob.toISO() : null,
    };
  }

  function validateForm (values, dobString = dobInput) {
    const errors = validateSubjectFormValues(values, dobString);
    form.setErrors(errors);
    return errors;
  }

  function setDateOfBirthError (message) {
    if (message) {
      form.setFieldError('dateOfBirth', message);
      return;
    }

    form.clearFieldError('dateOfBirth');
  }

  async function submitForm (values) {
    const errors = validateForm(values);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = buildSubmitPayload(values, dobInput);
    if (isCustodyContext) {
      handleCustodySubmit(payload);
      return;
    }

    await onSubmitMutation.mutateAsync(payload);
  }

  function scheduleAutoSave (values, dobString) {
    const normalized = normalizeValues(values);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      const payload = buildAutoSavePayload(values, dobString);
      autoSaveMutation.mutate({ payload, normalized });
    }, 700);
  }

  async function updateDeflectionCache (updatedDeflection) {
    await queryClient.setQueryData(['deflections', id], updatedDeflection);
    const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
    if (cachedDeflections) {
      const updatedDeflections = [...cachedDeflections];
      updatedDeflections[updatedDeflections.findIndex(deflection => deflection.id === id)] = updatedDeflection;
      queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
    }
  }

  const autoSaveMutation = useMutation({
    mutationFn: ({ payload }) => Api.deflections.subject(id, payload),
    onSuccess: async (response) => {
      await updateDeflectionCache(response.data);
    },
  });

  const onSubmitMutation = useMutation({
    mutationFn: (data) => Api.deflections.subject(id, data),
    onSuccess: async (response) => {
      await updateDeflectionCache(response.data);
      if (isCustodyContext) {
        setShowFile647fModal(false);
        showToast('Changes saved.', 'success');
        navigate(`/custody/${id}`);
      } else {
        navigate(isNew ? `/holds/${id}/deflection?isNew=true` : `/holds/${id}`);
      }
    },
    onError: () => {
      if (isCustodyContext) {
        showToast('Changes not saved. Please try again.', 'error');
        setShowFile647fModal(false);
      }
    },
  });

  let header;
  if (onSubmitMutation.isPending || autoSaveMutation.isPending) {
    header = <Text c='dimmed' size='lg'>Saving...</Text>;
  } else if (onSubmitMutation.isSuccess || autoSaveMutation.isSuccess) {
    header = <Text c='teal.6' size='lg'>Changes saved</Text>;
  } else if (onSubmitMutation.isError || autoSaveMutation.isError) {
    header = <Text c='red.6' size='lg'>Save failed</Text>;
  }

  const scrollToSection = searchParams.get('section');

  useEffect(() => {
    if (!scrollToSection || !form.initialized) {
      return;
    }
    const el = document.querySelector(`[data-section="${scrollToSection}"]`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [scrollToSection, form.initialized]);

  function handleCustodySubmit (data) {
    setPendingFormData(data);
    setShowFile647fModal(true);
  }

  function confirmCustodySave () {
    onSubmitMutation.mutateAsync(pendingFormData);
  }

  return (
    <>
      <Head>
        <title>Person details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={isCustodyContext ? `/custody/${id}` : (isNew ? '/holds' : `/holds/${id}`)} />
          <Group gap='xs'>
            {header}
            {!!header && isNew && !isCustodyContext && <Text c='gray.5' size='lg'>•</Text>}
            {isNew && !isCustodyContext && <Text c='dimmed' size='lg'>Step 1 of 3</Text>}
          </Group>
        </Group>
      </Header>
      <Container>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {incident ? incident.id : ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection ? deflection.id : ''}</Text>
        </Group>

        <Title order={2} mb='xs'>Person details</Title>
        <Text c='dimmed' size='md' mb='xl'>Start with what you know now. Fields marked * must be completed before you can transfer custody.</Text>
        <form onSubmit={form.onSubmit(submitForm)}>
          <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='xl'>
              <TextInput
                key={form.key('firstName')}
                label={<>First name<span>*</span></>}
                placeholder='Enter first name'
                {...form.getInputProps('firstName')}
              />
              <TextInput
                key={form.key('lastName')}
                label={<>Last name<span>*</span></>}
                placeholder='Enter last name'
                {...form.getInputProps('lastName')}
              />
              <TextInput
                key={form.key('middleInitial')}
                label='Middle initial (optional)'
                placeholder='Enter middle initial'
                {...form.getInputProps('middleInitial')}
              />
              <TextInput
                label={<>Date of birth<span>*</span></>}
                type='text'
                inputMode='numeric'
                maxLength={10}
                placeholder='MM/DD/YYYY'
                {...form.getInputProps('dateOfBirth')}
                value={dobInput}
                onChange={(event) => {
                  const formatted = formatInputDob(event.currentTarget.value);
                  setDobInput(formatted);
                  form.setFieldValue('dateOfBirth', formatted);
                  const dateOfBirthError = getDateOfBirthInputError(formatted, { allowPartial: true });
                  setDateOfBirthError(dateOfBirthError);
                  if (!isCustodyContext) {
                    scheduleAutoSave(form.getValues(), formatted);
                  }
                }}
                onBlur={() => {
                  setDateOfBirthError(getDateOfBirthInputError(dobInput));
                }}
              />
              <ChipInput
                label={<>Sex<span>*</span></>}
                options={['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'].map((sex) => ({
                  value: sex,
                  label: t(`sex.${sex}`),
                }))}
                {...form.getInputProps('sex')}
                key={form.key('sex')}
              />
              <ChipInput
                label={<>Race<span>*</span></>}
                options={['WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN'].map((race) => ({
                  value: race,
                  label: t(`race.${race}`),
                }))}
                {...form.getInputProps('race')}
                key={form.key('race')}
              />
              <TextInput
                key={form.key('driverLicense')}
                label="Driver's license number (optional)"
                placeholder='Enter license number'
                {...form.getInputProps('driverLicense')}
              />
              <TextInput
                key={form.key('localId')}
                label='SF Number (optional)'
                placeholder='Enter SF number'
                {...form.getInputProps('localId')}
              />
              <Accordion variant='section' defaultValue={['address', 'narcotics', 'drug-use']}>
                <Divider />
                <Accordion.Item value='address'>
                  <Accordion.Control>
                    <Title order={3}>Home address</Title>
                    <Text c='gray.5' size='sm'>Optional</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='xl'>
                      <AddressAutocomplete
                        form={form}
                        field='addressLine1'
                        key={form.key('addressLine1')}
                        placeholder='Enter street address line 1'
                        label='Street address (optional)'
                      />
                      <TextInput
                        key={form.key('addressLine2')}
                        label='Street address (optional)'
                        placeholder='Enter street address line 2'
                        {...form.getInputProps('addressLine2')}
                      />
                      <TextInput
                        key={form.key('city')}
                        label='City (optional)'
                        placeholder='Enter city'
                        {...form.getInputProps('city')}
                      />
                      <TextInput
                        key={form.key('state')}
                        label='State (optional)'
                        placeholder='Enter state'
                        {...form.getInputProps('state')}
                      />
                      <TextInput
                        key={form.key('postalCode')}
                        label='ZIP code (optional)'
                        placeholder='Enter ZIP code'
                        {...form.getInputProps('postalCode')}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                {(isNew || isCustodyContext) && (
                  <Accordion.Item value='narcotics' data-section='narcotics'>
                    <Accordion.Control>
                      <Title order={3}>Narcotics possession</Title>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap='xl'>
                        <BooleanInput
                          {...form.getInputProps('narcoticsSubstance')}
                          key={form.key('narcoticsSubstance')}
                          label={<>Possesses a controlled substance<span>*</span></>}
                        />
                        <BooleanInput
                          {...form.getInputProps('narcoticsParaphernalia')}
                          key={form.key('narcoticsParaphernalia')}
                          label={<>Possesses narcotics paraphernalia<span>*</span></>}
                        />
                        <Divider />
                        <Stack gap='xl' data-section='drug-use'>
                          <Title order={3}>Substance use</Title>
                          <Stack gap='xl'>
                            <BooleanInput
                              {...form.getInputProps('drugUseEvidence')}
                              key={form.key('drugUseEvidence')}
                              label={<>Evidence of substance use<span>*</span></>}
                            />
                            {showDrugTypeQuestion && (
                              <Input.Wrapper label={<>Substance type<span>*</span></>}>
                                <Chip.Group
                                  key={form.key('drugType')}
                                  {...form.getInputProps('drugType')}
                                >
                                  <Group gap='sm' mt='md'>
                                    {DRUG_TYPE_OPTIONS.map((drugType) => (
                                      <Chip key={drugType} value={drugType}>{t(`drugType.${drugType}`)}</Chip>
                                    ))}
                                  </Group>
                                </Chip.Group>
                              </Input.Wrapper>
                            )}
                          </Stack>
                        </Stack>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
              </Accordion>
              {isCustodyContext
                ? (
                  <Group>
                    <Button variant='light' color='red' onClick={() => navigate(`/custody/${id}`)}>Cancel</Button>
                    <Button type='submit'>Save changes</Button>
                  </Group>
                  )
                : (
                  <Button type='submit'>
                    {isNew ? 'Next: behavioral observations' : 'Save person details'}
                  </Button>
                  )}
            </Stack>
          </Fieldset>
        </form>
      </Container>
      {isCustodyContext && (
        <File647fModal
          opened={showFile647fModal}
          onClose={() => setShowFile647fModal(false)}
          onConfirm={confirmCustodySave}
          loading={onSubmitMutation.isPending}
        />
      )}
    </>
  );
}

export default SubjectForm;
