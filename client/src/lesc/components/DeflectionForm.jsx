import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft, IconSparkles, IconX } from '@tabler/icons-react';
import { ActionIcon, Accordion, Button, Chip, Collapse, Container, Fieldset, Group, Input, Loader, Stack, Text, Textarea, Title, UnstyledButton } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import AudioRecorder from '@/components/AudioRecorder';
import BooleanInput from '@/components/BooleanInput';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { buildDeflectionNarrative } from '@/utils/deflectionNarrative';
import { buildDeflectionUpdatePayload } from '@/utils/deflectionBehavior';

const initialValues = {
  behaviorAdditions: '',
  deflectionDetails: [],
  drugType: null,
  drugUseEvidence: null,
  volunteeredToReset: null,
};

function DeflectionForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const autoSaveTimerRef = useRef(null);
  const lastDetailSelectionKeyRef = useRef('');
  const generatedNarrativeRef = useRef('');
  const [generatedNarrative, setGeneratedNarrative] = useState('');
  const [narrativeContext, setNarrativeContext] = useState({
    drugType: null,
    drugUseEvidence: null,
    volunteeredToReset: null,
  });
  const [category, setCategory] = useState(null);
  const [showChipCustomizer, setShowChipCustomizer] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [behaviorText, setBehaviorText] = useState('');

  const { data: incident } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });

  const { data: deflection, isLoading } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const { data: deflectionDetailCategories } = useQuery({
    queryKey: ['deflections', 'detail-categories'],
    queryFn: () => Api.deflections.detailCategories.index({ include: 'deflectionDetails' }).then(response => response.data),
  });

  const [selectedDetails, setSelectedDetails] = useState([]);
  const [detailCategoryCounts, setDetailCategoryCounts] = useState({});

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    onValuesChange: (values) => {
      setNarrativeContext({
        drugType: values.drugType ?? null,
        drugUseEvidence: values.drugUseEvidence ?? null,
        volunteeredToReset: values.volunteeredToReset ?? null,
      });
      setBehaviorText((values.behaviorAdditions ?? '').trim());
      const nextDetailSelectionKey = getDetailSelectionKey(values.deflectionDetails);
      if (nextDetailSelectionKey !== lastDetailSelectionKeyRef.current) {
        lastDetailSelectionKeyRef.current = nextDetailSelectionKey;
        countValues(values);
      }
      if (form.initialized) {
        scheduleAutoSave(values);
      }
    }
  });

  useEffect(() => {
    if (!isLoading && !form.initialized) {
      if (deflection) {
        const normalized = normalizeFormValues({
          behaviorAdditions: deflection.behaviorAdditions,
          deflectionDetails: deflection.deflectionDetails?.map(detail => detail.id) ?? [],
          drugType: deflection.drugType,
          drugUseEvidence: deflection.drugUseEvidence,
          volunteeredToReset: deflection.volunteeredToReset,
        });
        setNarrativeContext({
          drugType: normalized.drugType,
          drugUseEvidence: normalized.drugUseEvidence,
          volunteeredToReset: normalized.volunteeredToReset,
        });
        form.initialize(normalized);
      }
    }
  }, [isLoading, deflection, form.initialized]);

  useEffect(() => {
    if (!deflectionDetailCategories) {
      return;
    }
    countValues(form.getValues());
  }, [deflectionDetailCategories]);

  useEffect(() => {
    const nextGeneratedNarrative = buildDeflectionNarrative({
      incident,
      behaviorText,
      drugType: narrativeContext.drugType,
      drugUseEvidence: narrativeContext.drugUseEvidence,
      volunteeredToReset: narrativeContext.volunteeredToReset,
    });
    generatedNarrativeRef.current = nextGeneratedNarrative;
    setGeneratedNarrative(nextGeneratedNarrative);
  }, [incident, narrativeContext.drugType, narrativeContext.drugUseEvidence, narrativeContext.volunteeredToReset, behaviorText]);

  function countValues (values) {
    const newSelectedDetails = [];
    const newDetailCategoryCounts = {};
    for (const detailId of values.deflectionDetails) {
      const category = deflectionDetailCategories?.find(category => category.deflectionDetails?.some(detail => detail.id === detailId));
      if (category) {
        newDetailCategoryCounts[category.id] = (newDetailCategoryCounts[category.id] ?? 0) + 1;
        newSelectedDetails.push(category.deflectionDetails?.find(detail => detail.id === detailId));
      }
    }
    setSelectedDetails(newSelectedDetails);
    setDetailCategoryCounts(newDetailCategoryCounts);
  }

  function getDetailSelectionKey (deflectionDetails = []) {
    return [...deflectionDetails]
      .map(detailId => String(detailId))
      .sort((a, b) => a.localeCompare(b))
      .join('|');
  }

  function normalizeFormValues (values) {
    return {
      behaviorAdditions: values.behaviorAdditions ?? '',
      deflectionDetails: [...(values.deflectionDetails ?? [])]
        .map((detailId) => detailId)
        .sort((a, b) => String(a).localeCompare(String(b))),
      drugType: values.drugType ?? null,
      drugUseEvidence: values.drugUseEvidence ?? null,
      volunteeredToReset: values.volunteeredToReset ?? null,
    };
  }

  function buildUpdatePayload (values, generatedNarrativeValue = generatedNarrative) {
    return buildDeflectionUpdatePayload({
      generatedNarrative: generatedNarrativeValue,
      behaviorAdditions: values.behaviorAdditions ?? '',
      deflectionDetails: values.deflectionDetails,
      volunteeredToReset: values.volunteeredToReset,
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
    const current = form.getValues().behaviorAdditions ?? '';
    const newText = current ? `${current} ${text}` : text;
    form.setFieldValue('behaviorAdditions', newText);
    analyzeNarrative(newText);
  }

  async function analyzeNarrative (text) {
    if (!text?.trim() || !deflectionDetailCategories) return;

    setAnalyzing(true);
    try {
      const categories = deflectionDetailCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        details: (cat.deflectionDetails ?? []).map(d => ({ id: d.id, name: d.name })),
      }));
      const response = await Api.ai.analyzeNarrative(text, categories);
      const { cleanedText, matchedDetailIds } = response.data;

      form.setFieldValue('behaviorAdditions', cleanedText);
      if (matchedDetailIds.length > 0) {
        form.setFieldValue('deflectionDetails', matchedDetailIds);
      }
    } catch (err) {
      // Analysis failed — the raw text is still in the field, just no auto-chips
    } finally {
      setAnalyzing(false);
    }
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
        <Text c='dimmed' size='md' mb='xl'>Describe what you observed, or use the mic to dictate.</Text>
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
              <Stack gap='sm'>
                <Textarea
                  label='Describe the encounter'
                  key={form.key('behaviorAdditions')}
                  autosize
                  minRows={4}
                  {...form.getInputProps('behaviorAdditions')}
                  placeholder='e.g. "Individual was stumbling and unable to stand on their own. Strong smell of alcohol. Found lying on the sidewalk near Market St..."'
                />
                <Group justify='space-between'>
                  <AudioRecorder
                    onResult={handleTranscriptionResult}
                    disabled={isLoading || onSubmitMutation.isPending}
                  />
                  {analyzing
                    ? (
                      <Group gap='xs'>
                        <Loader size='sm' />
                        <Text size='sm' c='dimmed'>Detecting tags...</Text>
                      </Group>
                      )
                    : (
                      <Button
                        variant='light'
                        size='sm'
                        leftSection={<IconSparkles size={16} />}
                        onClick={() => analyzeNarrative(form.getValues().behaviorAdditions)}
                        disabled={!form.getValues().behaviorAdditions?.trim()}
                      >
                        Detect tags
                      </Button>
                      )}
                </Group>
              </Stack>

              {selectedDetails.length > 0 && (
                <Input.Wrapper label='Tags'>
                  <Stack gap='xs' mt='xs'>
                    {selectedDetails.map(detail => (
                      <Group key={detail.id} gap='xs' justify='space-between' px='sm' py={6} style={{ background: 'var(--mantine-color-blue-light)', borderRadius: 8 }}>
                        <Text size='sm'>{detail.name}</Text>
                        <ActionIcon
                          variant='subtle'
                          color='gray'
                          size='sm'
                          onClick={() => {
                            const current = form.getValues().deflectionDetails;
                            form.setFieldValue('deflectionDetails', current.filter(id => id !== detail.id));
                          }}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                </Input.Wrapper>
              )}

              <UnstyledButton onClick={() => setShowChipCustomizer(v => !v)}>
                <Text size='sm' c='dimmed' td='underline'>
                  {showChipCustomizer ? 'Hide manual tags' : 'Choose tags manually...'}
                </Text>
              </UnstyledButton>

              <Collapse in={showChipCustomizer}>
                <Chip.Group
                  key={form.key('deflectionDetails')}
                  {...form.getInputProps('deflectionDetails')}
                  multiple
                >
                  <Accordion value={category} onChange={setCategory}>
                    {deflectionDetailCategories?.map(category => (
                      <Accordion.Item key={category.id} value={category.id}>
                        <Accordion.Control><Text size='lg' fw={detailCategoryCounts[category.id] > 0 ? '600' : 'normal'}>{category.name}{detailCategoryCounts[category.id] > 0 && ` (${detailCategoryCounts[category.id]})`}</Text></Accordion.Control>
                        <Accordion.Panel>
                          <Group gap='sm'>
                            {category.deflectionDetails?.map(detail => (
                              <Chip
                                key={detail.id}
                                value={detail.id}
                                size='lg'
                              >
                                {detail.name}
                              </Chip>
                            ))}
                          </Group>
                        </Accordion.Panel>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </Chip.Group>
                {selectedDetails.length > 0 && (
                  <Button variant='destructive' size='md' mt='md' onClick={() => form.setValues({ deflectionDetails: [] })}>Clear all</Button>
                )}
              </Collapse>

              <BooleanInput
                {...form.getInputProps('volunteeredToReset')}
                key={form.key('volunteeredToReset')}
                label='Person volunteered to be taken to RESET'
                description='Optional'
              />
              <Input.Wrapper label='647(f) narrative preview'>
                <Text style={{ whiteSpace: 'pre-wrap' }} size='sm'>
                  {generatedNarrative}
                </Text>
              </Input.Wrapper>
              <Button type='submit' mb='xl'>
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
