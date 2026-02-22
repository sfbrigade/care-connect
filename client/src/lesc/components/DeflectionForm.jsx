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

const initialValues = {
  behavior: '',
  deflectionDetails: [],
};

function DeflectionForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [isInitialized, setInitialized] = useState(false);
  const autoSaveTimerRef = useRef(null);

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
      if (!isInitialized) {
        return;
      }
      countValues(values);
      scheduleAutoSave(values);
    }
  });

  useEffect(() => {
    if (!isLoading && !isInitialized) {
      if (deflection) {
        const normalized = normalizeValues({
          behavior: deflection.behavior,
          deflectionDetails: deflection.deflectionDetails?.map(detail => detail.id) ?? [],
        });
        form.setInitialValues(normalized);
        form.reset();
        countValues(normalized);
      }
      setInitialized(true);
    }
  }, [isLoading, isInitialized, deflection]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  }, []);

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

  function normalizeValues (values) {
    return {
      behavior: values.behavior ?? '',
      deflectionDetails: [...(values.deflectionDetails ?? [])]
        .map(detailId => detailId)
        .sort((a, b) => String(a).localeCompare(String(b))),
    };
  }

  function scheduleAutoSave (values) {
    const normalized = normalizeValues(values);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
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
        <title>Deflection details</title>
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
          <Text size='md'>Incident {incident ? String(incident.id).padStart(6, '0') : ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection ? String(deflection.id).padStart(6, '0') : ''}</Text>
        </Group>
        <Title order={2} mb='xs'>Deflection details</Title>
        <Text c='dimmed' size='md' mb='xl'>Select what you observed. These details will be included in the legal forms.</Text>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
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
              <Textarea
                label={<>Narrative (arrestable behavior)<span>*</span><br /><Text size='md' mb='xs' c='dimmed'>Describe what you observed in your own words. Be specific and concise.</Text></>}
                key={form.key('behavior')}
                autosize
                {...form.getInputProps('behavior')}
                placeholder='E.g. “Person was unable to stand without assistance and repeatedly stepped into traffic…”'
              />
              <Button type='submit' mb='xl'>
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
