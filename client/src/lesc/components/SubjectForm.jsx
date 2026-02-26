import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Accordion, Button, Chip, Container, Divider, Fieldset, Group, Input, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';
import { formatInputDob } from '@/utils/format';
import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
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
  const isNewParam = searchParams.get('isNew') === 'true';
  const isCustodyContext = location.pathname.startsWith('/custody');
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);
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
    transformValues: (values) => ({
      ...values,
      narcoticsSubstance: values.narcoticsSubstance !== null ? values.narcoticsSubstance === 'true' : null,
      narcoticsParaphernalia: values.narcoticsParaphernalia !== null ? values.narcoticsParaphernalia === 'true' : null,
      drugUseEvidence: values.drugUseEvidence !== null ? values.drugUseEvidence === 'true' : null,
      drugType: values.drugUseEvidence === 'true' ? values.drugType ?? null : null,
      dateOfBirth: DateTime.fromFormat(dobInput.trim(), 'MM/dd/yyyy', { zone: 'local' }).toISO(),
    }),
    onValuesChange: (values) => {
      setShowDrugTypeQuestion(values.drugUseEvidence === 'true');
      if (!isInitialized) {
        return;
      }
      if (isCustodyContext) {
        return;
      }
      scheduleAutoSave(values, dobInput);
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

  const isNew = isNewParam || (!!deflection && !deflection.subjectId);

  useEffect(() => {
    if (!isLoading && !isInitialized) {
      if (deflection?.subject) {
        const normalized = normalizeValues({
          ...initialValues,
          ...deflection.subject,
          narcoticsSubstance: deflection.narcoticsSubstance !== null ? JSON.stringify(deflection.narcoticsSubstance) : null,
          narcoticsParaphernalia: deflection.narcoticsParaphernalia !== null ? JSON.stringify(deflection.narcoticsParaphernalia) : null,
          drugUseEvidence: deflection.drugUseEvidence !== null ? JSON.stringify(deflection.drugUseEvidence) : null,
          drugType: deflection.drugType ?? null,
          dateOfBirth: deflection.subject.dateOfBirth ? DateTime.fromISO(deflection.subject.dateOfBirth, { setZone: true }).toFormat('MM/dd/yyyy') : '',
        });
        setDobInput(normalized.dateOfBirth ?? '');
        setShowDrugTypeQuestion(normalized.drugUseEvidence === 'true');
        form.setInitialValues(normalized);
        form.reset();
      } else {
        setShowDrugTypeQuestion(false);
      }
      setInitialized(true);
    }
  }, [isLoading, isInitialized, deflection]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  }, []);

  function normalizeValues (values) {
    return {
      ...initialValues,
      ...values,
      narcoticsSubstance: values.narcoticsSubstance ?? null,
      narcoticsParaphernalia: values.narcoticsParaphernalia ?? null,
      drugUseEvidence: values.drugUseEvidence ?? null,
      drugType: values.drugType ?? null,
      dateOfBirth: values.dateOfBirth ?? '',
    };
  }

  function buildAutoSavePayload (values, dobString) {
    const normalized = normalizeValues(values);
    const parsedDob = DateTime.fromFormat((dobString ?? '').trim(), 'MM/dd/yyyy', { zone: 'local' });
    return {
      ...normalized,
      narcoticsSubstance: normalized.narcoticsSubstance !== null ? normalized.narcoticsSubstance === 'true' : null,
      narcoticsParaphernalia: normalized.narcoticsParaphernalia !== null ? normalized.narcoticsParaphernalia === 'true' : null,
      drugUseEvidence: normalized.drugUseEvidence !== null ? normalized.drugUseEvidence === 'true' : null,
      drugType: normalized.drugUseEvidence === 'true' ? normalized.drugType ?? null : null,
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
        showToast('Changes saved.', 'success', 4000, 'A new 647(f) record was filed with SFPD.');
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
    if (!scrollToSection || !isInitialized) {
      return;
    }
    const el = document.querySelector(`[data-section="${scrollToSection}"]`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [scrollToSection, isInitialized]);

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
        <title>Subject details</title>
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
          <Text size='md'>Incident {incident ? String(incident.id).padStart(6, '0') : ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection ? String(deflection.id).padStart(6, '0') : ''}</Text>
        </Group>

        <Title order={2} mb='xs'>Subject details</Title>
        <Text c='dimmed' size='md' mb='xl'>You can start with what you know now. Fields marked * must be completed before you can transfer custody.</Text>
        <form onSubmit={form.onSubmit(isCustodyContext ? handleCustodySubmit : onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={!isInitialized || !onSubmitMutation.isIdle} variant='unstyled'>
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
                placeholder='Optional'
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
              <Input.Wrapper
                label={<>Sex<span>*</span></>}
              >
                <Chip.Group
                  key={form.key('sex')}
                  {...form.getInputProps('sex')}
                >
                  {form.errors.sex && <Text color='red' size='sm'>{form.errors.sex}</Text>}
                  <Group gap='sm' mt='md'>
                    {['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'].map((sex) => (
                      <Chip key={sex} value={sex}>{t(`sex.${sex}`)}</Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </Input.Wrapper>
              <Input.Wrapper
                label={<>Race<span>*</span></>}
              >
                <Chip.Group
                  key={form.key('race')}
                  {...form.getInputProps('race')}
                >
                  {form.errors.race && <Text color='red' size='sm'>{form.errors.race}</Text>}
                  <Group gap='sm' mt='md'>
                    {['WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN'].map((race) => (
                      <Chip key={race} value={race}>{t(`race.${race}`)}</Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </Input.Wrapper>
              <TextInput
                key={form.key('driverLicense')}
                label="Driver's license number"
                placeholder='Optional'
                {...form.getInputProps('driverLicense')}
              />
              <TextInput
                key={form.key('localId')}
                label='SF Number (if available)'
                placeholder='Optional'
                {...form.getInputProps('localId')}
              />
              <Accordion variant='section' defaultValue={['address', 'narcotics']}>
                <Divider />
                <Accordion.Item value='address'>
                  <Accordion.Control>
                    <Title order={3}>Home address</Title>
                    <Text c='gray.5' size='sm'>Optional</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap='xl'>
                      <TextInput
                        key={form.key('addressLine1')}
                        label='Street address'
                        placeholder='Enter street address'
                        {...form.getInputProps('addressLine1')}
                      />
                      <TextInput
                        key={form.key('addressLine2')}
                        label='Street address (line 2)'
                        placeholder='Optional'
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
                        placeholder='Optional'
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
                {(isNew || isCustodyContext) && (
                  <Accordion.Item value='narcotics' data-section='narcotics'>
                    <Accordion.Control>
                      <Title order={3}>Narcotics</Title>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap='xl'>
                        <Input.Wrapper
                          label={<>Possesses a controlled substance<span>*</span></>}
                        >
                          <Chip.Group
                            key={form.key('narcoticsSubstance')}
                            {...form.getInputProps('narcoticsSubstance')}
                          >
                            <Group gap='sm' mt='md'>
                              <Chip value='true'>Yes</Chip>
                              <Chip value='false'>No</Chip>
                            </Group>
                          </Chip.Group>
                        </Input.Wrapper>
                        <Input.Wrapper
                          label={<>Possesses narcotics paraphernalia<span>*</span></>}
                        >
                          <Chip.Group
                            key={form.key('narcoticsParaphernalia')}
                            {...form.getInputProps('narcoticsParaphernalia')}
                          >
                            <Group gap='sm' mt='md'>
                              <Chip value='true'>Yes</Chip>
                              <Chip value='false'>No</Chip>
                            </Group>
                          </Chip.Group>
                        </Input.Wrapper>
                        <Divider />
                        <Stack gap='xl' data-section='drug-use'>
                          <Title order={3}>Drug use</Title>
                          <Stack gap='xl'>
                            <Input.Wrapper label='Evidence of drug use'>
                              <Chip.Group
                                key={form.key('drugUseEvidence')}
                                {...form.getInputProps('drugUseEvidence')}
                              >
                                <Group gap='sm' mt='md'>
                                  <Chip value='true'>Yes</Chip>
                                  <Chip value='false'>No</Chip>
                                </Group>
                              </Chip.Group>
                            </Input.Wrapper>
                            {showDrugTypeQuestion && (
                              <Input.Wrapper label='Drug type'>
                                <Chip.Group
                                  key={form.key('drugType')}
                                  {...form.getInputProps('drugType')}
                                >
                                  <Group gap='sm' mt='md'>
                                    <Chip value='INTOXICATING_LIQUOR'>Intoxicating liquor</Chip>
                                    <Chip value='DRUG'>Drug</Chip>
                                    <Chip value='TOLUENE'>Toluene</Chip>
                                    <Chip value='COMBINATION'>Combination</Chip>
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
                    {isNew ? 'Next: deflection details' : 'Save subject details'}
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
