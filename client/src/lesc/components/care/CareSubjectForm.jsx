import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button, Container, Fieldset, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import ChipInput from '@/components/ChipInput';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { formatInputDob } from '@/utils/format';

const initialValues = {
  firstName: '',
  lastName: '',
  middleInitial: '',
  dateOfBirth: '',
  sex: '',
  race: '',
  driverLicense: '',
};

function normalizeText (value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function validateCareSubject (values, dobInput) {
  const errors = {};
  const parsedDob = DateTime.fromFormat(dobInput.trim(), 'MM/dd/yyyy', { zone: 'local' });

  if (!values.firstName?.trim()) errors.firstName = 'This field is required';
  if (!values.lastName?.trim()) errors.lastName = 'This field is required';
  if (!dobInput.trim() || !parsedDob.isValid) errors.dateOfBirth = 'Enter a valid date';
  if (!values.sex) errors.sex = 'Select one';
  if (!values.race) errors.race = 'Select one';

  return errors;
}

function CareSubjectForm () {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [dobInput, setDobInput] = useState('');

  const form = useForm({
    mode: 'controlled',
    initialValues,
    validate: (values) => validateCareSubject(values, dobInput),
  });

  const { data: deflection, isLoading } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  useEffect(() => {
    if (isLoading || form.initialized) return;

    const subject = deflection?.subject ?? {};
    const dateOfBirth = subject.dateOfBirth
      ? DateTime.fromISO(subject.dateOfBirth, { setZone: true }).toFormat('MM/dd/yyyy')
      : '';

    setDobInput(dateOfBirth);
    form.initialize({
      ...initialValues,
      firstName: subject.firstName ?? '',
      lastName: subject.lastName ?? '',
      middleInitial: subject.middleInitial ?? '',
      dateOfBirth,
      sex: subject.sex ?? '',
      race: subject.race ?? '',
      driverLicense: subject.driverLicense ?? '',
    });
  }, [deflection, form, form.initialized, isLoading]);

  const updateSubjectMutation = useMutation({
    mutationFn: (values) => {
      const parsedDob = DateTime.fromFormat(dobInput.trim(), 'MM/dd/yyyy', { zone: 'local' });
      return Api.deflections.subject(id, {
        firstName: normalizeText(values.firstName),
        lastName: normalizeText(values.lastName),
        middleInitial: normalizeText(values.middleInitial),
        dateOfBirth: parsedDob.isValid ? parsedDob.toISO() : null,
        sex: values.sex || null,
        race: values.race || null,
        driverLicense: normalizeText(values.driverLicense),
        narcoticsSubstance: deflection?.narcoticsSubstance ?? null,
        narcoticsParaphernalia: deflection?.narcoticsParaphernalia ?? null,
        drugUseEvidence: deflection?.drugUseEvidence ?? null,
        drugType: deflection?.drugUseEvidence === true ? deflection?.drugType ?? null : null,
      });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['deflections', id], response.data);
      queryClient.setQueryData(['deflections', Number(id)], response.data);
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
      showToast('Details updated', 'success', 4000, 'Changes were saved successfully.');
      navigate(`/care/${id}`);
    },
    onError: () => {
      showToast('Details not updated', 'error', 4000, 'Changes were not saved. Please try again.');
      navigate(`/care/${id}`);
    },
  });

  return (
    <>
      <Head>
        <title>Edit Care Details</title>
      </Head>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to={`/care/${id}`} />
      </Header>
      <Container>
        <Stack gap='xl'>
          <Stack gap={0}>
            <Text c='dimmed' size='xl'>Edit details</Text>
            <Title order={3}>Update client identity details.</Title>
          </Stack>
          <form onSubmit={form.onSubmit((values) => updateSubjectMutation.mutate(values))}>
            <Fieldset disabled={isLoading || updateSubjectMutation.isPending} variant='unstyled'>
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
                  placeholder='Optional'
                  {...form.getInputProps('driverLicense')}
                />
                <Group>
                  <Button variant='destructive' onClick={() => navigate(`/care/${id}`)}>Cancel</Button>
                  <Button type='submit' loading={updateSubjectMutation.isPending}>Save changes</Button>
                </Group>
              </Stack>
            </Fieldset>
          </form>
        </Stack>
      </Container>
    </>
  );
}

export default CareSubjectForm;
