import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button, Container, Fieldset, Group, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import BooleanInput from '@/components/BooleanInput';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useFacilityContext } from '@/FacilityContext';

const requiredChipError = 'Select one';

const initialValues = {
  narcoticsSubstance: null,
  narcoticsParaphernalia: null,
};

function NarcoticsForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [missingRequiredFields, setMissingRequiredFields] = useState({
    narcoticsSubstance: true,
    narcoticsParaphernalia: true,
  });

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    onValuesChange: (values) => {
      setMissingRequiredFields({
        narcoticsSubstance: values.narcoticsSubstance === null,
        narcoticsParaphernalia: values.narcoticsParaphernalia === null,
      });
    },
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
      form.initialize({
        narcoticsSubstance: deflection.narcoticsSubstance,
        narcoticsParaphernalia: deflection.narcoticsParaphernalia,
      });
      setMissingRequiredFields({
        narcoticsSubstance: deflection.narcoticsSubstance === null,
        narcoticsParaphernalia: deflection.narcoticsParaphernalia === null,
      });
    }
  }, [isLoading, deflection]);

  const onSubmitMutation = useMutation({
    mutationFn: (data) => Api.deflections.update(id, data),
    onSuccess: async (response) => {
      await queryClient.setQueryData(['deflections', id], response.data);
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        const updatedDeflections = [...cachedDeflections];
        updatedDeflections[updatedDeflections.findIndex(deflection => deflection.id === id)] = response.data;
        queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
      }
      navigate(`/holds/${id}`);
    },
  });

  return (
    <>
      <Head>
        <title>Narcotics details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={`/holds/${id}`} />
          {onSubmitMutation.isPending && <Text c='dimmed' size='lg'>Saving...</Text>}
          {onSubmitMutation.isSuccess && <Text c='teal.6' size='lg'>Changes saved</Text>}
        </Group>
      </Header>
      <Container>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {incident ? incident.id : ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection ? deflection.id : ''}</Text>
        </Group>
        <Title order={2} mb='xs'>Narcotics details</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='xl'>
              <BooleanInput
                {...form.getInputProps('narcoticsSubstance')}
                key={form.key('narcoticsSubstance')}
                label={<>Possesses a controlled substance<span>*</span></>}
                error={missingRequiredFields.narcoticsSubstance ? requiredChipError : undefined}
              />
              <BooleanInput
                {...form.getInputProps('narcoticsParaphernalia')}
                key={form.key('narcoticsParaphernalia')}
                label={<>Possesses narcotics paraphernalia<span>*</span></>}
                error={missingRequiredFields.narcoticsParaphernalia ? requiredChipError : undefined}
              />
              <Button type='submit'>
                Save narcotics details
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default NarcoticsForm;
