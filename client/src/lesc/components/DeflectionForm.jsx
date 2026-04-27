import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Badge, Button, Chip, Container, Fieldset, Group, Input, Stack, Text, Textarea, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import AudioRecorder from '@/components/AudioRecorder';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { buildDeflectionNarrative } from '@/utils/deflectionNarrative';
import { buildDeflectionUpdatePayload } from '@/utils/deflectionBehavior';
import { CHARGE_TYPE_OPTIONS } from '@/lesc/constants/chargeTypeOptions';

const initialValues = {
  behaviorNarrative: '',
  chargeType: null,
  drugType: null,
  drugUseEvidence: null,
};

function DeflectionForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
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
          chargeType: deflection.chargeType,
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
      incident: deflection?.incident,
      drugType: narrativeContext.drugType,
      drugUseEvidence: narrativeContext.drugUseEvidence,
    });
    generatedNarrativeRef.current = nextGeneratedNarrative;
    setGeneratedNarrative(nextGeneratedNarrative);
  }, [deflection?.incident, narrativeContext.drugType, narrativeContext.drugUseEvidence]);

  function normalizeFormValues (values) {
    return {
      behaviorNarrative: values.behaviorNarrative ?? '',
      chargeType: values.chargeType ?? null,
      drugType: values.drugType ?? null,
      drugUseEvidence: values.drugUseEvidence ?? null,
    };
  }

  function buildUpdatePayload (values, generatedNarrativeValue = generatedNarrative) {
    return buildDeflectionUpdatePayload({
      generatedNarrative: generatedNarrativeValue,
      behaviorNarrative: values.behaviorNarrative ?? '',
      chargeType: values.chargeType ?? null,
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
    queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'my-holds'] });
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
        <title>Arrest details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={isNew ? `/holds/${id}/substance?isNew=true` : `/holds/${id}`} aria-label='Go back' />
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
          <Title order={3}>Arrest details</Title>
          {isNew && <Badge variant='light' color='gray' size='lg' radius='xl'>3/4</Badge>}
        </Group>
        <Text c='dimmed' size='xl' lh='md' mb='xl'>Describe what you observed that justifies the arrest, and select charge type.</Text>
        <form onSubmit={form.onSubmit((values) => {
          if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
          }
          return onSubmitMutation.mutateAsync(buildUpdatePayload(values));
        })}
        >
          <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='2xl'>
              <Stack gap='lg'>
                <AudioRecorder
                  onResult={handleTranscriptionResult}
                  onBusyChange={setRecorderBusy}
                  disabled={isLoading || onSubmitMutation.isPending}
                />
                <Stack gap='xs'>
                  <Textarea
                    label='Behavioral observation'
                    withAsterisk
                    key={form.key('behaviorNarrative')}
                    autosize
                    minRows={4}
                    {...form.getInputProps('behaviorNarrative')}
                    placeholder='e.g. "Individual was stumbling and unable to stand on their own. Strong smell of alcohol. Found lying on the sidewalk near Market St..."'
                  />
                  <Text size='sm' c='dimmed'>Used on 647(f) and 849(b) forms</Text>
                </Stack>
                <Input.Wrapper
                  label='Select a charge type'
                  withAsterisk
                  error={form.errors.chargeType}
                >
                  <Chip.Group
                    key={form.key('chargeType')}
                    {...form.getInputProps('chargeType')}
                  >
                    <Group gap='sm' mt='md'>
                      {CHARGE_TYPE_OPTIONS.map((chargeType) => (
                        <Chip key={chargeType} value={chargeType}>{t(`chargeType.${chargeType}`)}</Chip>
                      ))}
                    </Group>
                  </Chip.Group>
                </Input.Wrapper>
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
