import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Accordion, Button, Chip, Container, Fieldset, Group, Input, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import BooleanInput from '@/components/BooleanInput';
import DictationTextarea from '@/components/DictationTextarea';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { buildDeflectionNarrative } from '@/utils/deflectionNarrative';
import { buildDeflectionUpdatePayload } from '@/utils/deflectionBehavior';

const initialValues = {
  behaviorAdditions: '',
  deflectionDetails: [],
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
  const [category, setCategory] = useState(null);

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
          volunteeredToReset: deflection.volunteeredToReset,
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
    let nextGeneratedNarrative = '';
    if (selectedDetails.length > 0) {
      nextGeneratedNarrative = buildDeflectionNarrative({
        incident,
        observedBehaviorNames: selectedDetails.map(detail => detail?.name),
      });
    }
    generatedNarrativeRef.current = nextGeneratedNarrative;
    setGeneratedNarrative(nextGeneratedNarrative);
  }, [incident, selectedDetails]);

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
        <Text c='dimmed' size='md' mb='xl'>Select the behaviors you observed that support the arrest.</Text>
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
                <Input.Wrapper label='Selected observations'>
                  <Text>
                    {selectedDetails.map(detail => detail.name).join('; ')}
                  </Text>
                  <Button variant='destructive' size='md' mt='md' onClick={() => form.setValues({ deflectionDetails: [] })}>Clear all</Button>
                </Input.Wrapper>
              )}
              <BooleanInput
                {...form.getInputProps('volunteeredToReset')}
                key={form.key('volunteeredToReset')}
                label='Person volunteered to be taken to RESET'
                description={<Text c='gray.5' size='sm'>Optional</Text>}
              />
              <Input.Wrapper label='647(f) narrative'>
                <Text size='md' mb='xs' c='dimmed'>This text is auto-generated and will be inserted in the 647(f). Add to it using the form below.</Text>
                <Text c={(isNew || !!generatedNarrative) ? undefined : 'red.6'} style={{ whiteSpace: 'pre-wrap' }}>
                  {generatedNarrative || 'Select from observations above to generate narrative text.'}
                </Text>
              </Input.Wrapper>
              <DictationTextarea
                form={form}
                field='behaviorAdditions'
                label='Add to 647(f) narrative (optional)'
                key={form.key('behaviorAdditions')}
                autosize
                {...form.getInputProps('behaviorAdditions')}
                placeholder='e.g. “Person was unable to stand without assistance and repeatedly stepped into traffic…”'
              />
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
