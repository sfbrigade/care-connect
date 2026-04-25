import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft, IconScan } from '@tabler/icons-react';
import { Accordion, Badge, Button, Chip, Container, Divider, Fieldset, Group, Input, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import AddressAutocomplete from '@/components/AddressAutocomplete';
import Api from '@/Api';
import BooleanInput from '@/components/BooleanInput';
import ChipInput from '@/components/ChipInput';
import IdScanner from '@/components/IdScanner';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import { formatInputDob } from '@/utils/format';
import { validateSubject } from '@/utils/validators';

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
  const [scannerOpened, setScannerOpened] = useState(false);
  const { showToast } = useToast();
  const autoSaveTimerRef = useRef(null);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    transformValues: (values) => ({
      ...values,
      drugType: values.drugUseEvidence ? values.drugType ?? null : null,
      dateOfBirth: DateTime.fromFormat(dobInput.trim(), 'MM/dd/yyyy', { zone: 'local' }).toISO(),
    }),
    onValuesChange: (values) => {
      setShowDrugTypeQuestion(values.drugUseEvidence);
      if (form.initialized && !isCustodyContext) {
        scheduleAutoSave(values, dobInput);
      }
    }
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
          const errors = validateSubject({
            ...normalized,
            dateOfBirth: deflection.subject.dateOfBirth,
          });
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
    return {
      ...normalized,
      drugType: normalized.drugUseEvidence ? normalized.drugType ?? null : null,
      dateOfBirth: parsedDob.isValid ? parsedDob.toISO() : null,
    };
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
    queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'my-holds'] });
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
        navigate(isNew ? `/holds/${id}/substance?isNew=true` : `/holds/${id}`);
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

  function handleIdScanResult (data) {
    setScannerOpened(false);
    if (data.firstName) form.setFieldValue('firstName', data.firstName);
    if (data.lastName) form.setFieldValue('lastName', data.lastName);
    if (data.middleInitial) form.setFieldValue('middleInitial', data.middleInitial);
    if (data.dateOfBirth) {
      setDobInput(data.dateOfBirth);
      form.setFieldValue('dateOfBirth', data.dateOfBirth);
    }
    if (data.sex) form.setFieldValue('sex', data.sex);
    if (data.documentType === 'DRIVERS_LICENSE' && data.documentNumber) {
      form.setFieldValue('driverLicense', data.documentNumber);
    }
    if (data.addressLine1) form.setFieldValue('addressLine1', data.addressLine1);
    if (data.city) form.setFieldValue('city', data.city);
    if (data.state) form.setFieldValue('state', data.state);
    if (data.postalCode) form.setFieldValue('postalCode', data.postalCode);
    if (!isCustodyContext) {
      scheduleAutoSave(form.getValues(), data.dateOfBirth || dobInput);
    }
  }

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
        <title>Personal details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={isCustodyContext ? `/custody/${id}` : (isNew ? '/holds' : `/holds/${id}`)} aria-label='Go back' />
          {header}
        </Group>
      </Header>
      <Container>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {deflection ? deflection.incidentId : ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection ? deflection.id : ''}</Text>
        </Group>

        <Group gap='sm' mb='xs' align='center'>
          <Title order={2}>Personal details</Title>
          {isNew && !isCustodyContext && <Badge variant='light' color='gray' size='lg' radius='xl'>1/4</Badge>}
        </Group>
        <Text c='dimmed' size='md' mb='md'>Scan an ID to fill details faster, or enter them manually.</Text>
        <Button
          variant='light'
          leftSection={<IconScan size={18} />}
          onClick={() => setScannerOpened(true)}
          mb='xl'
        >
          Scan ID
        </Button>
        <IdScanner
          opened={scannerOpened}
          onResult={handleIdScanResult}
          onClose={() => setScannerOpened(false)}
        />
        <form onSubmit={form.onSubmit(isCustodyContext ? handleCustodySubmit : onSubmitMutation.mutateAsync)}>
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
                label='Middle initial'
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
                  if (!isCustodyContext) {
                    scheduleAutoSave(form.getValues(), formatted);
                  }
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
              <Divider />
              <Accordion variant='section' defaultValue={[]}>
                <Accordion.Item value='optional'>
                  <Accordion.Control>
                    <Title order={3}>Optional details</Title>
                    <Text c='gray.5' size='sm'>ID numbers and address</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='xl'>
                      <TextInput
                        key={form.key('driverLicense')}
                        label="Driver's license number"
                        placeholder='Enter license number'
                        {...form.getInputProps('driverLicense')}
                      />
                      <TextInput
                        key={form.key('localId')}
                        label='SF Number'
                        placeholder='Enter SF number'
                        {...form.getInputProps('localId')}
                      />
                      <AddressAutocomplete
                        form={form}
                        field='addressLine1'
                        key={form.key('addressLine1')}
                        placeholder='Enter street address line 1'
                        label='Street address'
                      />
                      <TextInput
                        key={form.key('addressLine2')}
                        label='Street address'
                        placeholder='Enter street address line 2'
                        {...form.getInputProps('addressLine2')}
                      />
                      <TextInput
                        key={form.key('city')}
                        label='City'
                        placeholder='Enter city'
                        {...form.getInputProps('city')}
                      />
                      <TextInput
                        key={form.key('state')}
                        label='State'
                        placeholder='Enter state'
                        {...form.getInputProps('state')}
                      />
                      <TextInput
                        key={form.key('postalCode')}
                        label='ZIP code'
                        placeholder='Enter ZIP code'
                        {...form.getInputProps('postalCode')}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              {isCustodyContext && (
                <>
                  <Accordion variant='section' defaultValue={['narcotics']}>
                    <Accordion.Item value='narcotics' data-section='narcotics'>
                      <Accordion.Control>
                        <Title order={3}>Substance details</Title>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap='xl'>
                          <BooleanInput
                            {...form.getInputProps('narcoticsSubstance')}
                            key={form.key('narcoticsSubstance')}
                            label={<>Controlled substance found<span>*</span></>}
                          />
                          <BooleanInput
                            {...form.getInputProps('narcoticsParaphernalia')}
                            key={form.key('narcoticsParaphernalia')}
                            label={<>Paraphernalia found<span>*</span></>}
                          />
                          <BooleanInput
                            {...form.getInputProps('drugUseEvidence')}
                            key={form.key('drugUseEvidence')}
                            label={<>Signs of substance use<span>*</span></>}
                          />
                          {showDrugTypeQuestion && (
                            <Input.Wrapper label={<>Substance used<span>*</span></>}>
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
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>
                </>
              )}
              {isCustodyContext
                ? (
                  <Group>
                    <Button variant='light' color='red' onClick={() => navigate(`/custody/${id}`)}>Cancel</Button>
                    <Button type='submit'>Save changes</Button>
                  </Group>
                  )
                : (
                  <Button type='submit'>
                    {isNew ? 'Next: Substance details' : 'Save person details'}
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
