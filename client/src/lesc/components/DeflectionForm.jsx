import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Accordion, Box, Button, Chip, Container, Divider, Fieldset, Group, Input, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';

import { useFacilityContext } from '@/FacilityContext';
import Api from '@/api';
import IconButtonLink from '@/components/IconButtonLink';

const initialValues = {
  behavior: '',
};

function DeflectionForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    transformValues: values => ({
      ...values,
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

  useEffect(() => {
    if (!isLoading) {
      if (deflection) {
        form.setInitialValues({
          behavior: deflection.behavior,
        });
        form.reset();
      }
      setInitialized(true);
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
      navigate(isNew ? `/holds/${id}/property?isNew=true` : `/holds/${id}`);
    },
  });

  return (
    <>
      <Head>
        <title>Deflection details</title>
      </Head>
      <Container>
        <Box mb='xl'>
          <IconButtonLink icon={IconArrowLeft} to={isNew ? `/holds/${id}/subject?isNew=true` : `/holds/${id}`} />
        </Box>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {incident?.cadNumber ?? ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection?.id?.substring(0, 3) ?? ''}</Text>
        </Group>
        <Title order={2} mb='xs'>Deflection details</Title>
        <Text c='dimmed' size='md' mb='xl'>Select what you observed. These details will beincluded in the legal forms.</Text>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={!isInitialized} variant='unstyled'>
            <Stack gap='xl'>
              <Textarea
                label={<>Narrative (arrestable behavior)<span>*</span><br /><Text size='md' c='dimmed'>Describe what you observed in your own words. Be specific and concise.</Text></>}
                key={form.key('behavior')}
                {...form.getInputProps('behavior')}
                placeholder='E.g. “Subject was unable to stand without assistance and repeatedly stepped into traffic…”'
              />
              <Button type='submit'>
                {isNew ? 'Next: Personal property' : 'Save deflection details'}
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default DeflectionForm;
