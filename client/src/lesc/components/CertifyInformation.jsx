import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Head } from '@unhead/react';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import { Badge, Button, Checkbox, Container, Fieldset, Group, Stack, Text, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';

const declaration = 'I declare under penalty of perjury that the information I have entered is true and correct, based on my personal knowledge, or is based on information and belief following an investigation of the events and parties involved. I agree that this declaration will apply to any subsequent edits I make to this information.';

function CertifyInformation () {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('isNew') === 'true';
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();
  const [certifiedAt, setCertifiedAt] = useState(null);

  const { data: deflection, isLoading } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  useEffect(() => {
    if (!isLoading && deflection) {
      setCertifiedAt(deflection.certifiedAt ?? null);
    }
  }, [isLoading, deflection]);

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
      showToast('Changes saved.', 'success');
      navigate('/holds');
    },
  });

  function handleCertificationChange (event) {
    const nextCertifiedAt = event.currentTarget.checked ? new Date().toISOString() : null;
    setCertifiedAt(nextCertifiedAt);
    autoSaveMutation.mutate({ certifiedAt: nextCertifiedAt });
  }

  function handleSubmit (event) {
    event.preventDefault();
    if (!certifiedAt) {
      return;
    }
    onSubmitMutation.mutate({ certifiedAt });
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
        <title>Certify information</title>
      </Head>
      <Header>
        <Group w='100%' justify='space-between'>
          <IconButtonLink icon={IconArrowLeft} to={isNew ? `/holds/${id}/property?isNew=true` : `/holds/${id}`} aria-label='Go back' />
          {header}
          <IconButtonLink icon={IconX} to='/holds' aria-label='Close' />
        </Group>
      </Header>
      <Container>
        <Group gap='xs' mb='xs'>
          <Text size='md'>Incident {deflection ? deflection.incidentId : ''}</Text>
          <Text c='gray.5' size='md'>•</Text>
          <Text size='md' c='dimmed'>Hold {deflection ? deflection.id : ''}</Text>
        </Group>
        <Group gap='sm' mb='2xl' align='center'>
          <Title order={3}>Certify information</Title>
          {isNew && <Badge variant='light' color='gray' size='lg' radius='xl'>5/5</Badge>}
        </Group>
        <form onSubmit={handleSubmit}>
          <Fieldset disabled={isLoading || onSubmitMutation.isPending} variant='unstyled'>
            <Stack gap='2xl'>
              <Stack gap='md'>
                <Group gap='xs' align='flex-start' wrap='nowrap' px='xs'>
                  <Text fw={600} size='md' lh='md'>Read and agree to the declaration below</Text>
                  <Text c='red.6' size='md' lh='md'>*</Text>
                </Group>
                <Checkbox
                  size='md'
                  color='indigo.6'
                  radius='sm'
                  checked={Boolean(certifiedAt)}
                  onChange={handleCertificationChange}
                  label={<Text size='md' lh='md'>{declaration}</Text>}
                  styles={{ body: { alignItems: 'flex-start' } }}
                />
              </Stack>
              <Button type='submit' mb='xl' disabled={!certifiedAt} loading={onSubmitMutation.isPending} w='fit-content'>
                Finish details
              </Button>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default CertifyInformation;
