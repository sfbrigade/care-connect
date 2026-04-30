import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Badge, Button, Container, Fieldset, Group, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import BooleanInput from '@/components/BooleanInput';
import ChipInput from '@/components/ChipInput';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useFacilityContext } from '@/FacilityContext';
import { validateSubstance } from '@/utils/validators';

import { DRUG_TYPE_OPTIONS } from '../constants/drugTypeOptions';

const initialValues = {
  narcoticsSubstance: null,
  narcoticsParaphernalia: null,
  drugUseEvidence: null,
  drugType: null,
};

function SubstanceForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { t } = useTranslation();
  const [showDrugTypeQuestion, setShowDrugTypeQuestion] = useState(false);
  const autoSaveTimerRef = useRef(null);

  const { data: deflection, isLoading } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    transformValues: (values) => ({
      ...values,
      drugType: values.drugUseEvidence ? values.drugType ?? null : null,
    }),
    onValuesChange: (values) => {
      setShowDrugTypeQuestion(values.drugUseEvidence);
      if (form.initialized) {
        scheduleAutoSave(values);
      }
    },
  });

  useEffect(() => {
    if (!isLoading && !form.initialized) {
      if (deflection) {
        const normalized = normalizeValues({
          narcoticsSubstance: deflection.narcoticsSubstance,
          narcoticsParaphernalia: deflection.narcoticsParaphernalia,
          drugUseEvidence: deflection.drugUseEvidence,
          drugType: deflection.drugType,
        });
        form.initialize(normalized);
        if (!isNew) {
          form.setErrors(validateSubstance(normalized));
        }
      }
    }
  }, [isLoading, deflection, form.initialized]);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  }, []);

  function normalizeValues (values) {
    return {
      narcoticsSubstance: values.narcoticsSubstance ?? null,
      narcoticsParaphernalia: values.narcoticsParaphernalia ?? null,
      drugUseEvidence: values.drugUseEvidence ?? null,
      drugType: values.drugType ?? null,
    };
  }

  function scheduleAutoSave (values) {
    const normalized = normalizeValues(values);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveMutation.mutate({
        ...normalized,
        drugType: normalized.drugUseEvidence ? normalized.drugType : null,
      });
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
    mutationFn: (data) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      return Api.deflections.update(id, data);
    },
    onSuccess: async (response) => {
      await updateDeflectionCache(response.data);
      navigate(isNew ? `/holds/${id}/deflection?isNew=true` : `/holds/${id}`);
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
        <title>Substance details</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={isNew ? `/holds/${id}/subject?isNew=true` : `/holds/${id}`} />
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
          <Title order={2}>Substance details</Title>
          {isNew && <Badge variant='light' color='gray' size='lg' radius='xl'>2/5</Badge>}
        </Group>
        <Text c='dimmed' size='md' mb='xl'>Record what was found and any signs of use.</Text>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='xl'>
              <BooleanInput
                {...form.getInputProps('narcoticsSubstance')}
                key={form.key('narcoticsSubstance')}
                label={<>Controlled substance found<span>*</span></>}
              />
              <BooleanInput
                {...form.getInputProps('narcoticsParaphernalia')}
                key={form.key('narcoticsParaphernalia')}
                label={<>Paraphernalia found<span>*</span></>}
              />
              <BooleanInput
                {...form.getInputProps('drugUseEvidence')}
                key={form.key('drugUseEvidence')}
                label={<>Signs of substance use<span>*</span></>}
              />
              {showDrugTypeQuestion && (
                <ChipInput
                  key={form.key('drugType')}
                  {...form.getInputProps('drugType')}
                  label={<>Substance used<span>*</span></>}
                  options={DRUG_TYPE_OPTIONS.map((drugType) => ({
                    value: drugType,
                    label: t(`drugType.${drugType}`),
                  }))}
                />
              )}
              <Button type='submit' mb='xl'>
                {isNew ? 'Next: Behavioral observations' : 'Save substance details'}
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default SubstanceForm;
