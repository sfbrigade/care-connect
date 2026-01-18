import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Accordion, Box, Button, Chip, Container, Divider, Fieldset, Group, Input, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';

import Api from '@/Api';
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
};

function SubjectForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
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
    if (!isLoading) {
      if (deflection.subject) {
        form.setInitialValues({
          ...deflection.subject,
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
      const isNew = !deflection.subjectId;
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

  return (
    <>
      <Head>
        <title>Subject details</title>
      </Head>
      <Container>
        <Box mb='xl'>
          <IconButtonLink icon={IconArrowLeft} to={deflection?.subjectId ? `/holds/${id}` : '/holds'} />
        </Box>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {incident?.cadNumber ?? ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection?.id?.substring(0, 3) ?? ''}</Text>
        </Group>
        <Title order={2} mb='xs'>Subject details</Title>
        <Text c='dimmed' size='md' mb='xl'>You can start with what you know now. Fields marked * must be completed before you can transfer custody.</Text>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={!isInitialized} variant='unstyled'>
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
                    <Chip value='MALE'>Male</Chip>
                    <Chip value='FEMALE'>Female</Chip>
                    <Chip value='OTHER'>Other</Chip>
                    <Chip value='UNKNOWN'>Unknown</Chip>
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
                    <Chip value='WHITE'>White</Chip>
                    <Chip value='BLACK'>Black</Chip>
                    <Chip value='HISPANIC'>Hispanic or Latin</Chip>
                    <Chip value='ASIAN'>Asian</Chip>
                    <Chip value='OTHER'>Other</Chip>
                    <Chip value='UNKNOWN'>Unknown</Chip>
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
              <Accordion variant='section' defaultValue='address'>
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
              </Accordion>
              <Button type='submit'>
                {deflection?.subjectId ? 'Save subject details' : 'Next: deflection details'}
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default SubjectForm;
