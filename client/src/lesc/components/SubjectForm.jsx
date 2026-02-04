import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Accordion, Button, Chip, Container, Divider, Fieldset, Group, Input, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useFacilityContext } from '@/FacilityContext';

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
};

function SubjectForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);
  const [accordionValue, setAccordionValue] = useState(['address', 'narcotics']);
  const narcoticsSubstanceRef = useRef(null);
  const { t } = useTranslation();

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    transformValues: (values) => ({
      ...values,
      narcoticsSubstance: values.narcoticsSubstance !== null ? values.narcoticsSubstance === 'true' : null,
      narcoticsParaphernalia: values.narcoticsParaphernalia !== null ? values.narcoticsParaphernalia === 'true' : null,
    }),
  });

  const { data: incident } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });

  const { data: deflection, isLoading } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const isNew = searchParams.get('isNew') === 'true' || !deflection?.subjectId;

  useEffect(() => {
    if (!isLoading) {
      if (deflection.subject) {
        form.setInitialValues({
          ...initialValues,
          ...deflection.subject,
          narcoticsSubstance: deflection.narcoticsSubstance !== null ? JSON.stringify(deflection.narcoticsSubstance) : null,
          narcoticsParaphernalia: deflection.narcoticsParaphernalia !== null ? JSON.stringify(deflection.narcoticsParaphernalia) : null,
          dateOfBirth: deflection.subject.dateOfBirth ? DateTime.fromISO(deflection.subject.dateOfBirth, { setZone: true }).toISODate() : '',
        });
        form.reset();
      }
      setInitialized(true);
    }
  }, [isLoading, deflection]);

  const onSubmitMutation = useMutation({
    mutationFn: (data) => Api.deflections.subject(id, data),
    onSuccess: async (response) => {
      await queryClient.setQueryData(['deflections', id], response.data);
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        const updatedDeflections = [...cachedDeflections];
        updatedDeflections[updatedDeflections.findIndex(deflection => deflection.id === id)] = response.data;
        queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
      }
      navigate(isNew ? `/holds/${id}/deflection?isNew=true` : `/holds/${id}`);
    },
  });

  const handleSubmit = (values) => {
    // For new holds, validate narcotics questions are answered
    if (isNew) {
      const errors = {};
      if (values.narcoticsSubstance === null) {
        errors.narcoticsSubstance = 'This field is required';
      }
      if (values.narcoticsParaphernalia === null) {
        errors.narcoticsParaphernalia = 'This field is required';
      }
      if (Object.keys(errors).length > 0) {
        form.setErrors(errors);
        // Auto-expand the narcotics accordion if collapsed
        if (!accordionValue.includes('narcotics')) {
          setAccordionValue([...accordionValue, 'narcotics']);
        }
        // Scroll to the narcotics section
        setTimeout(() => {
          narcoticsSubstanceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
    }
    onSubmitMutation.mutateAsync(values);
  };

  return (
    <>
      <Head>
        <title>Subject details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={isNew ? '/holds' : `/holds/${id}`} />
          {isNew && onSubmitMutation.isIdle && <Text c='dimmed' size='lg'>Step 1 of 3</Text>}
          {onSubmitMutation.isPending && <Text c='dimmed' size='lg'>Saving...</Text>}
          {onSubmitMutation.isSuccess && <Text c='teal.6' size='lg'>Changes saved</Text>}
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
        <form onSubmit={form.onSubmit(handleSubmit)}>
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
                key={form.key('dateOfBirth')}
                label={<>Date of birth<span>*</span></>}
                type='date'
                {...form.getInputProps('dateOfBirth')}
              />
              <Input.Wrapper
                label={<>Sex<span>*</span></>}
              >
                <Chip.Group
                  key={form.key('sex')}
                  {...form.getInputProps('sex')}
                >
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
                label='SF ID (if available)'
                placeholder='Optional'
                {...form.getInputProps('localId')}
              />
              <Accordion variant='section' value={accordionValue} onChange={setAccordionValue} multiple>
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
                {isNew && (
                  <Accordion.Item value='narcotics'>
                    <Accordion.Control>
                      <Title order={3}>Narcotics</Title>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap='xl'>
                        <Input.Wrapper
                          ref={narcoticsSubstanceRef}
                          label={<>Possesses a controlled substance<span>*</span></>}
                          error={form.errors.narcoticsSubstance}
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
                          error={form.errors.narcoticsParaphernalia}
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
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
              </Accordion>
              <Button type='submit'>
                {isNew ? 'Next: deflection details' : 'Save subject details'}
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default SubjectForm;
