import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button, Container, Fieldset, Group, Stack, Text, Textarea, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import AudioRecorder from '@/components/AudioRecorder';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { buildDeflectionNarrative } from '@/utils/deflectionNarrative';
import { buildDeflectionUpdatePayload } from '@/utils/deflectionBehavior';

const initialValues = {
  behaviorNarrative: '',
  drugType: null,
  drugUseEvidence: null,
};

function DeflectionForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const autoSaveTimerRef = useRef(null);
  const generatedNarrativeRef = useRef('');
  const [generatedNarrative, setGeneratedNarrative] = useState('');
  const [narrativeContext, setNarrativeContext] = useState({
    drugType: null,
    drugUseEvidence: null,
  });
  const [recorderBusy, setRecorderBusy] = useState(false);

  const { data: incident } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });

  const { data: deflection, isLoading } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    onValuesChange: (values) => {
      setNarrativeContext({
        drugType: values.drugType ?? null,
        drugUseEvidence: values.drugUseEvidence ?? null,
      });
      if (form.initialized) {
        scheduleAutoSave(values);
      }
    }
  });

  useEffect(() => {
    if (!isLoading && !form.initialized) {
      if (deflection) {
        const normalized = normalizeFormValues({
          behaviorNarrative: deflection.behaviorNarrative,
          drugType: deflection.drugType,
          drugUseEvidence: deflection.drugUseEvidence,
        });
        setNarrativeContext({
          drugType: normalized.drugType,
          drugUseEvidence: normalized.drugUseEvidence,
        });
        form.initialize(normalized);
      }
    }
  }, [isLoading, deflection, form.initialized]);

  useEffect(() => {
    const nextGeneratedNarrative = buildDeflectionNarrative({
      incident,
      drugType: narrativeContext.drugType,
      drugUseEvidence: narrativeContext.drugUseEvidence,
    });
    generatedNarrativeRef.current = nextGeneratedNarrative;
    setGeneratedNarrative(nextGeneratedNarrative);
  }, [incident, narrativeContext.drugType, narrativeContext.drugUseEvidence]);

  function normalizeFormValues (values) {
    return {
      behaviorNarrative: values.behaviorNarrative ?? '',
      drugType: values.drugType ?? null,
      drugUseEvidence: values.drugUseEvidence ?? null,
    };
  }

  function buildUpdatePayload (values, generatedNarrativeValue = generatedNarrative) {
    return buildDeflectionUpdatePayload({
      generatedNarrative: generatedNarrativeValue,
      behaviorNarrative: values.behaviorNarrative ?? '',
    });
  }

  function scheduleAutoSave (values) {
    const normalized = buildUpdatePayload(values);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      autoSaveMutation.mutate(normalized);
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
    mutationFn: (data) => Api.deflections.update(id, data),
    onSuccess: async (response) => {
      await updateDeflectionCache(response.data);
    },
  });

  const onSubmitMutation = useMutation({
    mutationFn: (data) => Api.deflections.update(id, data),
    onSuccess: async (response) => {
      await updateDeflectionCache(response.data);
      navigate(isNew ? `/holds/${id}/property?isNew=true` : `/holds/${id}`);
    },
  });

  function handleTranscriptionResult (text) {
    const current = form.getValues().behaviorNarrative ?? '';
    const newText = current ? `${current} ${text}` : text;
    form.setFieldValue('behaviorNarrative', newText);
  }

  let header;
  if (onSubmitMutation.isPending || autoSaveMutation.isPending) {
    header = <Text c='dimmed' size='lg'>Saving...</Text>;
  } else if (onSubmitMutation.isSuccess || autoSaveMutation.isSuccess) {
    header = <Text c='teal.6' size='lg'>Changes saved</Text>;
  } else if (onSubmitMutation.isError || autoSaveMutation.isError) {
    header = <Text c='red.6' size='lg'>Save failed</Text>;
  }

  return (
    <>
      <Head>
        <title>Behavioral observations</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={isNew ? `/holds/${id}/subject?isNew=true` : `/holds/${id}`} />
          <Group gap='xs'>
            {header}
            {!!header && isNew && <Text c='gray.5' size='lg'>•</Text>}
            {isNew && <Text c='dimmed' size='lg'>2 of 3</Text>}
          </Group>
        </Group>
      </Header>
      <Container>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {incident ? incident.id : ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection ? deflection.id : ''}</Text>
        </Group>
        <Title order={2} mb='xs'>Behavioral observations</Title>
        <Text c='dimmed' size='md' mb='xl'>Describe what you observed.</Text>
        <form onSubmit={form.onSubmit((values) => {
          if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
          }
          return onSubmitMutation.mutateAsync(buildUpdatePayload(values));
        })}
        >
          <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='xl'>
              <Stack gap='xs'>
                <AudioRecorder
                  onResult={handleTranscriptionResult}
                  onBusyChange={setRecorderBusy}
                  disabled={isLoading || onSubmitMutation.isPending}
                />
                <Textarea
                  label='Arrestable behavior'
                  withAsterisk
                  key={form.key('behaviorNarrative')}
                  autosize
                  minRows={4}
                  {...form.getInputProps('behaviorNarrative')}
                  placeholder='e.g. "Individual was stumbling and unable to stand on their own. Strong smell of alcohol. Found lying on the sidewalk near Market St..."'
                />
                <Text size='sm' c='dimmed'>Used on 647(f) and 849(b) forms</Text>
              </Stack>
              <Button type='submit' mb='xl' disabled={recorderBusy}>
                {isNew ? 'Next: Personal property' : 'Save behavioral observations'}
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default DeflectionForm;
