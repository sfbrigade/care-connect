import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Container, Group, Stack, Text, Textarea, Title } from '@mantine/core';
import { Head } from '@unhead/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import useEnsureReleaseNarrative from '@/hooks/useEnsureReleaseNarrative';
import { IconArrowLeft } from '@tabler/icons-react';

function setDeflectionCache (queryClient, deflectionId, updatedDeflection) {
  queryClient.setQueryData(['deflections', String(deflectionId)], updatedDeflection);
  queryClient.setQueryData(['deflections', Number(deflectionId)], updatedDeflection);
}

function CustodyReleaseNarrativeForm () {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [releaseNarrative, setReleaseNarrative] = useState('');
  const initializedDeflectionIdRef = useRef(null);

  const deflectionQuery = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });
  const deflection = deflectionQuery.data;

  const incidentQuery = useQuery({
    queryKey: ['incidents', deflection?.incidentId],
    queryFn: () => Api.incidents.get(deflection.incidentId).then(response => response.data),
    enabled: !!deflection?.incidentId,
  });
  const incidentReady = !deflection?.incidentId || incidentQuery.isFetched;

  const resolvedReleaseNarrative = useEnsureReleaseNarrative({
    deflection,
    incident: incidentQuery.data,
    incidentReady,
  });

  useEffect(() => {
    if (!deflection?.id || !incidentReady) return;
    if (initializedDeflectionIdRef.current === id) return;
    initializedDeflectionIdRef.current = id;
    setReleaseNarrative(resolvedReleaseNarrative);
  }, [deflection?.id, id, incidentReady, resolvedReleaseNarrative]);

  const hasChanges = releaseNarrative !== resolvedReleaseNarrative;

  const saveReleaseNarrativeMutation = useMutation({
    mutationFn: () => Api.deflections.update(deflection.id, { releaseNarrative: releaseNarrative.trim() || null }),
    onSuccess: (response) => {
      setDeflectionCache(queryClient, deflection.id, response.data);
      showToast('Narrative saved', 'success', 4000, 'The 849(b) form has been updated.');
      navigate(`/custody/${deflection.id}`);
    },
    onError: () => {
      showToast('Narrative not saved', 'error', 4000, 'We couldn\'t save this narrative. Copy your text and try again.');
    },
  });

  function returnToDetails () {
    navigate(`/custody/${id}`);
  }

  return (
    <>
      <Head>
        <title>Edit 849(b) Narrative</title>
      </Head>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to={`/custody/${id}`} aria-label='Go back' />
      </Header>
      <Container>
        <Stack gap='2xl'>
          <Stack gap='xl'>
            <Stack gap={0}>
              <Text size='xl' c='dimmed'>Edit 849(b) narrative</Text>
              <Title order={3} fw={400}>
                This text appears on the 849(b) form. Any edits you make here will automatically update the document.
              </Title>
            </Stack>
            <Textarea
              aria-label='849(b) narrative'
              value={releaseNarrative}
              onChange={(event) => setReleaseNarrative(event.currentTarget.value)}
              autosize
              minRows={6}
            />
          </Stack>
          <Group gap='sm'>
            <Button
              variant='light'
              color='red'
              size='lg'
              onClick={returnToDetails}
            >
              Cancel
            </Button>
            <Button
              size='lg'
              disabled={!hasChanges}
              loading={saveReleaseNarrativeMutation.isPending}
              onClick={() => saveReleaseNarrativeMutation.mutate()}
            >
              Save changes
            </Button>
          </Group>
        </Stack>
      </Container>
    </>
  );
}

export default CustodyReleaseNarrativeForm;
