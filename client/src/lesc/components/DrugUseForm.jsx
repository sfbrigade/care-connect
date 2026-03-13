import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button, Chip, Container, Fieldset, Group, Input, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import BooleanInput from '@/components/BooleanInput';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useFacilityContext } from '@/FacilityContext';

const initialValues = {
  drugUseEvidence: null,
  drugType: null,
};

function DrugUseForm () {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const [showDrugTypeQuestion, setShowDrugTypeQuestion] = useState(false);
  const { t } = useTranslation();

  const form = useForm({
    mode: 'uncontrolled',
    initialValues,
    transformValues: (values) => ({
      drugUseEvidence: values.drugUseEvidence,
      drugType: values.drugUseEvidence ? values.drugType ?? null : null,
    }),
    onValuesChange: (values) => {
      setShowDrugTypeQuestion(values.drugUseEvidence);
    }
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
        form.initialize({
          drugUseEvidence: deflection.drugUseEvidence,
          drugType: deflection.drugType ?? null,
        });
        setShowDrugTypeQuestion(deflection.drugUseEvidence);
      }
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
        <title>Drug use details</title>
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
        <Title order={2} mb='xs'>Drug use details</Title>
        <form onSubmit={form.onSubmit(onSubmitMutation.mutateAsync)}>
          <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='xl'>
              <BooleanInput
                {...form.getInputProps('drugUseEvidence')}
                key={form.key('drugUseEvidence')}
                label='Evidence of drug use'
              />
              {showDrugTypeQuestion && (
                <Input.Wrapper label='Drug type'>
                  <Chip.Group
                    key={form.key('drugType')}
                    {...form.getInputProps('drugType')}
                  >
                    <Group gap='sm' mt='md'>
                      <Chip value='INTOXICATING_LIQUOR'>{t('drugType.INTOXICATING_LIQUOR')}</Chip>
                      <Chip value='DRUG'>{t('drugType.DRUG')}</Chip>
                      <Chip value='TOLUENE'>{t('drugType.TOLUENE')}</Chip>
                      <Chip value='COMBINATION'>{t('drugType.COMBINATION')}</Chip>
                    </Group>
                  </Chip.Group>
                </Input.Wrapper>
              )}
              <Button type='submit'>
                Save drug use details
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default DrugUseForm;
