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
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import { isBlank, getMissingChipClassNames, getRequiredTextInputClassNames } from '@/utils/formStyles';
import { formatInputDob } from '@/utils/format';

import File647fModal from './custody/File647fModal';

const requiredFieldError = 'This field is required';
const requiredChipError = 'Select one';

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

function isMissingDob (dobInput) {
  const parsedDob = DateTime.fromFormat((dobInput ?? '').trim(), 'MM/dd/yyyy', { zone: 'local' });
  return !parsedDob.isValid;
}

function getMissingRequiredFields (values, dobInput, { includeNarcotics }) {
  return {
    firstName: isBlank(values.firstName),
    lastName: isBlank(values.lastName),
    dateOfBirth: isMissingDob(dobInput),
    sex: !values.sex,
    race: !values.race,
    narcoticsSubstance: includeNarcotics ? values.narcoticsSubstance === null : false,
    narcoticsParaphernalia: includeNarcotics ? values.narcoticsParaphernalia === null : false,
  };
}

function hasAnyEnteredSubjectRequiredField (values, dobInput, { includeNarcotics }) {
  return !(
    isBlank(values.firstName) &&
    isBlank(values.lastName) &&
    isBlank(dobInput) &&
    !values.sex &&
    !values.race &&
    (!includeNarcotics || (values.narcoticsSubstance === null && values.narcoticsParaphernalia === null))
  );
}

function getSubjectHintsStorageKey (deflectionId) {
  return `_session-subject-details-hints-${deflectionId}`;
}

function SubjectForm () {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNewParam = searchParams.get('isNew') === 'true';
  const isCustodyContext = location.pathname.startsWith('/custody');
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { t } = useTranslation();
  const [dobInput, setDobInput] = useState('');
  const [showFile647fModal, setShowFile647fModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [showDrugTypeQuestion, setShowDrugTypeQuestion] = useState(false);
  const [missingRequiredFields, setMissingRequiredFields] = useState(() =>
    getMissingRequiredFields(initialValues, '', { includeNarcotics: isNewParam || isCustodyContext })
  );
  const [shouldShowIncompleteHints, setShouldShowIncompleteHints] = useState(isCustodyContext);
  const { showToast } = useToast();
  const autoSaveTimerRef = useRef(null);
  const missingRequiredFieldsRef = useRef(missingRequiredFields);
  const hintsStorageKeyRef = useRef(null);
  const hasInitializedHintVisibilityRef = useRef(false);

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
      setMissingRequiredFields(getMissingRequiredFields(values, dobInput, {
        includeNarcotics: shouldHighlightNarcoticsRequiredFields
      }));
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

  const isNew = isNewParam || (!!deflection && !deflection.subjectId);
  const shouldHighlightNarcoticsRequiredFields = isNew || isCustodyContext;

  useEffect(() => {
    if (!id || isLoading || hasInitializedHintVisibilityRef.current) return;
    const hintsStorageKey = getSubjectHintsStorageKey(id);
    hintsStorageKeyRef.current = hintsStorageKey;
    const normalized = deflection?.subject
      ? normalizeValues({
        ...initialValues,
        ...deflection.subject,
        narcoticsSubstance: deflection.narcoticsSubstance !== null ? JSON.stringify(deflection.narcoticsSubstance) : null,
        narcoticsParaphernalia: deflection.narcoticsParaphernalia !== null ? JSON.stringify(deflection.narcoticsParaphernalia) : null,
        drugUseEvidence: deflection.drugUseEvidence !== null ? JSON.stringify(deflection.drugUseEvidence) : null,
        drugType: deflection.drugType ?? null,
        dateOfBirth: deflection.subject.dateOfBirth ? DateTime.fromISO(deflection.subject.dateOfBirth, { setZone: true }).toFormat('MM/dd/yyyy') : '',
      })
      : initialValues;
    const existingSubjectShouldShowHints = !!deflection?.subject &&
      hasAnyEnteredSubjectRequiredField(normalized, normalized.dateOfBirth ?? '', {
        includeNarcotics: shouldHighlightNarcoticsRequiredFields
      }) &&
      Object.values(getMissingRequiredFields(normalized, normalized.dateOfBirth ?? '', {
        includeNarcotics: shouldHighlightNarcoticsRequiredFields
      })).some(Boolean);
    setShouldShowIncompleteHints(
      isCustodyContext || (
        window.sessionStorage.getItem(hintsStorageKey) === 'true' &&
        existingSubjectShouldShowHints
      )
    );
    hasInitializedHintVisibilityRef.current = true;
  }, [id, isCustodyContext, deflection, isLoading, shouldHighlightNarcoticsRequiredFields]);

  useEffect(() => {
    missingRequiredFieldsRef.current = missingRequiredFields;
  }, [missingRequiredFields]);

  useEffect(() => () => {
    if (!hintsStorageKeyRef.current || isCustodyContext) return;

    const currentValues = form.getValues();
    const currentDobInput = dobInput;
    const hasAnyEnteredData = hasAnyEnteredSubjectRequiredField(currentValues, currentDobInput, {
      includeNarcotics: shouldHighlightNarcoticsRequiredFields
    });
    const hasMissingRequiredFields = Object.values(getMissingRequiredFields(currentValues, currentDobInput, {
      includeNarcotics: shouldHighlightNarcoticsRequiredFields
    })).some(Boolean);

    if (hasAnyEnteredData && hasMissingRequiredFields) {
      window.sessionStorage.setItem(hintsStorageKeyRef.current, 'true');
      return;
    }

    window.sessionStorage.removeItem(hintsStorageKeyRef.current);
  }, [dobInput, form, isCustodyContext, shouldHighlightNarcoticsRequiredFields]);

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

  function getRequiredTextInputProps (field, missingPlaceholder, defaultPlaceholder = missingPlaceholder) {
    const isMissing = shouldShowIncompleteHints && missingRequiredFields[field];
    return {
      placeholder: isMissing ? missingPlaceholder : defaultPlaceholder,
      error: isMissing ? requiredFieldError : undefined,
      classNames: getRequiredTextInputClassNames(isMissing),
    };
  }

  function getRequiredChipGroupProps (field) {
    const isMissing = shouldShowIncompleteHints && missingRequiredFields[field];
    return {
      error: isMissing ? requiredChipError : undefined,
      chipClassNames: getMissingChipClassNames(isMissing),
    };
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
        <Text c='dimmed' size='md' mb='xl'>You can start with what you know now. Fields marked * must be completed before you can transfer custody.</Text>
        <form onSubmit={form.onSubmit(isCustodyContext ? handleCustodySubmit : onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='xl'>
              <TextInput
                key={form.key('firstName')}
                label={<>First name<span>*</span></>}
                {...form.getInputProps('firstName')}
                {...getRequiredTextInputProps('firstName', 'Enter first name')}
              />
              <TextInput
                key={form.key('lastName')}
                label={<>Last name<span>*</span></>}
                {...form.getInputProps('lastName')}
                {...getRequiredTextInputProps('lastName', 'Enter last name')}
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
                {...form.getInputProps('dateOfBirth')}
                {...getRequiredTextInputProps('dateOfBirth', 'Enter date of birth', 'MM/DD/YYYY')}
                value={dobInput}
                onChange={(event) => {
                  const formatted = formatInputDob(event.currentTarget.value);
                  setDobInput(formatted);
                  form.setFieldValue('dateOfBirth', formatted);
                  setMissingRequiredFields(getMissingRequiredFields(
                    { ...form.getValues(), dateOfBirth: formatted },
                    formatted,
                    { includeNarcotics: shouldHighlightNarcoticsRequiredFields }
                  ));
                  if (!isCustodyContext) {
                    scheduleAutoSave(form.getValues(), formatted);
                  }
                }}
              />
              {(() => {
                const sexProps = getRequiredChipGroupProps('sex');
                return (
                  <Input.Wrapper
                    label={<>Sex<span>*</span></>}
                    error={sexProps.error}
                  >
                    <Chip.Group
                      key={form.key('sex')}
                      {...form.getInputProps('sex')}
                    >
                      <Group gap='sm' mt='md'>
                        {['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'].map((sex) => (
                          <Chip key={sex} value={sex} classNames={sexProps.chipClassNames}>{t(`sex.${sex}`)}</Chip>
                        ))}
                      </Group>
                    </Chip.Group>
                  </Input.Wrapper>
                );
              })()}
              {(() => {
                const raceProps = getRequiredChipGroupProps('race');
                return (
                  <Input.Wrapper
                    label={<>Race<span>*</span></>}
                    error={raceProps.error}
                  >
                    <Chip.Group
                      key={form.key('race')}
                      {...form.getInputProps('race')}
                    >
                      <Group gap='sm' mt='md'>
                        {['WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER', 'UNKNOWN'].map((race) => (
                          <Chip key={race} value={race} classNames={raceProps.chipClassNames}>{t(`race.${race}`)}</Chip>
                        ))}
                      </Group>
                    </Chip.Group>
                  </Input.Wrapper>
                );
              })()}
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
                      <AddressAutocomplete
                        form={form}
                        field='addressLine1'
                        key={form.key('addressLine1')}
                        label='Street address'
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
                        <BooleanInput
                          {...form.getInputProps('narcoticsSubstance')}
                          key={form.key('narcoticsSubstance')}
                          label={<>Possesses a controlled substance<span>*</span></>}
                          error={getRequiredChipGroupProps('narcoticsSubstance').error}
                        />
                        <BooleanInput
                          {...form.getInputProps('narcoticsParaphernalia')}
                          key={form.key('narcoticsParaphernalia')}
                          label={<>Possesses narcotics paraphernalia<span>*</span></>}
                          error={getRequiredChipGroupProps('narcoticsParaphernalia').error}
                        />
                        <Divider />
                        <Stack gap='xl' data-section='drug-use'>
                          <Title order={3}>Drug use</Title>
                          <Stack gap='xl'>
                            <BooleanInput
                              {...form.getInputProps('drugUseEvidence')}
                              key={form.key('drugUseEvidence')}
                              label='Evidence of drug use'
                            />
                            {showDrugTypeQuestion && (
                              <Input.Wrapper label='Drug type'>
                                <Chip.Group
                                  key={form.key('drugType')}
                                  {...form.getInputProps('drugType')}
                                >
                                  <Group gap='sm' mt='md'>
                                    <Chip value='INTOXICATING_LIQUOR'>{t('drugType.INTOXICATING_LIQUOR')}</Chip>
                                    <Chip value='DRUG'>{t('drugType.DRUG')}</Chip>
                                    <Chip value='TOLUENE'>{t('drugType.TOLUENE')}</Chip>
                                    <Chip value='COMBINATION'>{t('drugType.COMBINATION')}</Chip>
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
                    {isNew ? 'Next: arrest details' : 'Save person details'}
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
