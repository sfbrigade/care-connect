import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Accordion, Anchor, Button, Chip, Container, Fieldset, Group, Input, Stack, Text, Textarea, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useFacilityContext } from '@/FacilityContext';
import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { buildDeflectionNarrative } from '@/utils/deflectionNarrative';
import { buildDeflectionUpdatePayload } from '@/utils/deflectionBehavior';
import classes from './DeflectionForm.module.css';

const initialValues = {
  behaviorAdditions: '',
  deflectionDetails: [],
  volunteeredToReset: null,
};

function getDeflectionHintsStorageKey (deflectionId) {
  return `_session-deflection-details-hints-${deflectionId}`;
}

function DeflectionForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const lastDetailSelectionKeyRef = useRef('');
  const generatedNarrativeRef = useRef('');
  const [generatedNarrative, setGeneratedNarrative] = useState('');
  const [shouldShowIncompleteHints, setShouldShowIncompleteHints] = useState(false);
  const selectedDetailsRef = useRef([]);
  const hintsStorageKeyRef = useRef(null);

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

  useEffect(() => {
    if (!id) return;
    const hintsStorageKey = getDeflectionHintsStorageKey(id);
    hintsStorageKeyRef.current = hintsStorageKey;
    setShouldShowIncompleteHints(window.sessionStorage.getItem(hintsStorageKey) === 'true');
  }, [id]);

  useEffect(() => {
    selectedDetailsRef.current = selectedDetails;
  }, [selectedDetails]);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    onValuesChange: (values) => {
      if (!isInitialized) {
        return;
      }
      const nextDetailSelectionKey = getDetailSelectionKey(values.deflectionDetails);
      if (nextDetailSelectionKey !== lastDetailSelectionKeyRef.current) {
        lastDetailSelectionKeyRef.current = nextDetailSelectionKey;
        countValues(values);
      }
      scheduleAutoSave(values);
    }
  });

  useEffect(() => {
    if (!isLoading && !isInitialized) {
      if (deflection) {
        const normalized = normalizeFormValues({
          behaviorAdditions: deflection.behaviorAdditions,
          deflectionDetails: deflection.deflectionDetails?.map(detail => detail.id) ?? [],
          volunteeredToReset: deflection.volunteeredToReset !== null ? JSON.stringify(deflection.volunteeredToReset) : null,
        });
        form.setInitialValues(normalized);
        form.reset();
        lastDetailSelectionKeyRef.current = getDetailSelectionKey(normalized.deflectionDetails);
        countValues(normalized);
      }
      setInitialized(true);
    }
  }, [isLoading, isInitialized, deflection]);

  useEffect(() => {
    if (!isInitialized || !deflectionDetailCategories) {
      return;
    }
    countValues(form.getValues());
  }, [isInitialized, deflectionDetailCategories]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    let nextGeneratedNarrative = '';
    if (selectedDetails.length > 0) {
      nextGeneratedNarrative = buildDeflectionNarrative({
        incident,
        observedBehaviorNames: selectedDetails.map(detail => detail?.name),
      });
    }
    generatedNarrativeRef.current = nextGeneratedNarrative;
    setGeneratedNarrative(nextGeneratedNarrative);
  }, [isInitialized, incident, selectedDetails]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      if (isInitialized) {
        autoSaveMutation.mutate(buildUpdatePayload(form.getValues(), generatedNarrativeRef.current));
      }
    }
    if (!hintsStorageKeyRef.current) return;

    if (selectedDetailsRef.current.length === 0) {
      window.sessionStorage.setItem(hintsStorageKeyRef.current, 'true');
      return;
    }

    window.sessionStorage.removeItem(hintsStorageKeyRef.current);
  }, [isInitialized]);

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
      volunteeredToReset: values.volunteeredToReset ?? null,
    };
  }

  function buildUpdatePayload (values, generatedNarrativeValue = generatedNarrative) {
    return buildDeflectionUpdatePayload({
      generatedNarrative: generatedNarrativeValue,
      behaviorAdditions: values.behaviorAdditions ?? '',
      deflectionDetails: values.deflectionDetails,
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
    onSuccess: async (response, variables) => {
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
  const behaviorAdditionsInputProps = form.getInputProps('behaviorAdditions');
  const missingNarrativeSelection = shouldShowIncompleteHints && selectedDetails.length === 0;

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
        <Title order={2} mb='xs'>Arrest details</Title>
        <Text c='dimmed' size='md' mb='xl'>Select what you observed. This text will be inserted in the 647(f). Add to it using the form below.</Text>
        <form onSubmit={form.onSubmit((values) => {
          if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
          }
          return onSubmitMutation.mutateAsync(buildUpdatePayload(values));
        })}
        >
          <Fieldset disabled={!isInitialized || !onSubmitMutation.isIdle} variant='unstyled'>
            <Stack gap='xl'>
              <Chip.Group
                key={form.key('deflectionDetails')}
                {...form.getInputProps('deflectionDetails')}
                multiple
              >
                <Accordion defaultValue=''>
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
                <Input.Wrapper label='Selected observations'>
                  <Text>
                    {selectedDetails.map(detail => detail.name).join('; ')}
                  </Text>
                  <Anchor onClick={() => form.setValues({ deflectionDetails: [] })}>Clear all</Anchor>
                </Input.Wrapper>
              )}
              <Input.Wrapper label='Person volunteered to be taken to RESET'>
                <Chip.Group
                  key={form.key('volunteeredToReset')}
                  {...form.getInputProps('volunteeredToReset')}
                >
                  <Group gap='sm' mt='md'>
                    <Chip value='true'>Yes</Chip>
                    <Chip value='false'>No</Chip>
                  </Group>
                </Chip.Group>
              </Input.Wrapper>
              <Input.Wrapper
                label={
                  <>
                    647(f) narrative<Text span c='red.6'>*</Text>
                  </>
                }
              >
                <Text size='md' mb='xs' c='dimmed'>This text will be inserted in the 647(f). Add to it using the form below.</Text>
                <Text c={missingNarrativeSelection ? 'red.6' : undefined} className={classes.preWrap}>
                  {generatedNarrative || 'Select observations to generate narrative text.'}
                </Text>
              </Input.Wrapper>
              <Textarea
                label='Add to narrative (optional)'
                key={form.key('behaviorAdditions')}
                autosize
                {...behaviorAdditionsInputProps}
                placeholder='E.g. “Person was unable to stand without assistance and repeatedly stepped into traffic…”'
              />
              <Button type='submit' mb='xl'>
                {isNew ? 'Next: Personal property' : 'Save arrest details'}
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default DeflectionForm;
