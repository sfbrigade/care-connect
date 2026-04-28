import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Box, Card, Button, Chip, Container, Group, Input, Stack, Text, Textarea, Title } from '@mantine/core';
import { Head } from '@unhead/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import useEnsureReleaseNarrative from '../../../hooks/useEnsureReleaseNarrative';
import { IconAlertCircle, IconArrowBackUp, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { getPrefilledLegalReleaseState } from './legalReleasePresets';

const RELEASE_TOAST_KEY = 'custodyReleaseToast';

function LegalReleaseQuestions () {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledState = getPrefilledLegalReleaseState(searchParams);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const backTo = searchParams.get('from') === 'detail'
    ? `/custody/${id}`
    : '/custody';

  const [releaseReasonId, setReleaseReasonId] = useState(prefilledState.releaseReasonId);
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);
  const [hasReviewedNarrative, setHasReviewedNarrative] = useState(false);
  const [narrativeDraft, setNarrativeDraft] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [otherDestination, setOtherDestination] = useState('');
  const [exitDestinationId, setExitDestinationId] = useState(prefilledState.exitDestinationId);

  const isMedicalRelease = releaseReasonId === 'medical_issue';
  const isOtherRelease = releaseReasonId === 'other';
  const isExitRelease = isMedicalRelease || isOtherRelease;

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const incidentQuery = useQuery({
    queryKey: ['incidents', deflection?.incidentId],
    queryFn: () => Api.incidents.get(deflection.incidentId).then(response => response.data),
    enabled: !!deflection?.incidentId,
  });
  const incident = incidentQuery.data;

  const narrativeText = useEnsureReleaseNarrative({
    deflection,
    incident,
    incidentReady: !deflection?.incidentId || incidentQuery.isFetched,
  });

  useEffect(() => {
    if (!isEditingNarrative) {
      setNarrativeDraft(narrativeText);
    }
  }, [narrativeText, isEditingNarrative]);

  const saveNarrativeMutation = useMutation({
    mutationFn: () => Api.deflections.update(id, { releaseNarrative: narrativeDraft.trim() || null }),
    onSuccess: () => {
      setIsEditingNarrative(false);
      queryClient.invalidateQueries({ queryKey: ['deflections', String(id)] });
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: () => {
      const payload = {
        releaseReasonId,
      };
      if (isMedicalRelease) {
        payload.exitDestinationId = exitDestinationId;
      }
      if (isOtherRelease) {
        payload.otherReleaseReason = otherReason.trim();
        payload.otherReleaseDestination = otherDestination.trim();
      }
      return Api.deflections.release(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deflections', String(id)] });
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
      if (isExitRelease) {
        showToast('Exit recorded', 'success', 4000, 'Person now appears in "Exited facility" under "Legally released" (for 24 hours).');
        navigate(backTo);
        return;
      }
      window.sessionStorage.setItem(RELEASE_TOAST_KEY, JSON.stringify({
        variant: 'success',
        title: 'Person legally released',
        body: '849(b) record finalized. Please print the release certificate.',
      }));
      window.sessionStorage.setItem('_session-custody', 'released');
      window.sessionStorage.setItem('custodyHighlightTarget', String(id));
      navigate('/custody');
    },
    onError: (error) => {
      const status = error?.response?.status;
      if (status === 409) {
        window.sessionStorage.setItem(RELEASE_TOAST_KEY, JSON.stringify({
          variant: 'error',
          title: 'This person is already legally released.',
        }));
      } else {
        window.sessionStorage.setItem(RELEASE_TOAST_KEY, JSON.stringify({
          variant: 'warning',
          title: 'Couldn\'t save release',
          body: 'Please check your connection and try again.',
        }));
      }
      navigate('/custody');
    },
  });

  return (
    <>
      <Head>
        <title>Confirm Legal Release</title>
      </Head>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to={backTo} aria-label='Go back' />
      </Header>
      <Container>
        <Stack gap='xl'>
          <Stack gap={0}>
            <Text size='xl' c='dimmed'>Confirm legal release</Text>
            <Title order={3}>Review the 849(b) before continuing.</Title>
          </Stack>

          <Card bg='gray.1' p='md' radius='md'>
            <Stack gap='md'>
              <Stack gap={0}>
                <Text size='md' fz='md' c='dimmed'>849(b) narrative</Text>
                {!isEditingNarrative && <Text size='md' fz='md' style={{ whiteSpace: 'pre-wrap' }}>{narrativeText}</Text>}
                {isEditingNarrative && (
                  <Textarea
                    value={narrativeDraft}
                    onChange={(event) => setNarrativeDraft(event.currentTarget.value)}
                    minRows={6}
                    autosize
                  />
                )}
              </Stack>

              {!isEditingNarrative && (
                !hasReviewedNarrative
                  ? (
                    <Stack gap='xs' align='flex-start'>
                      <Button radius='xl' onClick={() => setHasReviewedNarrative(true)}>
                        Mark as reviewed
                      </Button>
                      <Button variant='subtle' color='indigo' radius='xl' onClick={() => setIsEditingNarrative(true)}>
                        Edit narrative
                      </Button>
                    </Stack>
                    )
                  : (
                    <Group gap='xs'>
                      <Button
                        variant='secondary'
                        radius='xl'
                        leftSection={<IconCheck size={20} />}
                        disabled
                      >
                        Reviewed
                      </Button>
                      <Button
                        variant='subtle'
                        color='indigo'
                        radius='xl'
                        leftSection={<IconArrowBackUp size={20} />}
                        onClick={() => setHasReviewedNarrative(false)}
                      >
                        Undo review
                      </Button>
                    </Group>
                    )
              )}

              {isEditingNarrative && (
                <Group>
                  <Button
                    variant='secondary'
                    onClick={() => {
                      setNarrativeDraft(narrativeText);
                      setIsEditingNarrative(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => saveNarrativeMutation.mutate()} loading={saveNarrativeMutation.isPending}>
                    Save narrative
                  </Button>
                </Group>
              )}
            </Stack>
          </Card>

          {hasReviewedNarrative && (
            <>
              <Stack gap='xl'>
                <Title order={3}>Choose a release reason.</Title>
                <Input.Wrapper label='Release reason' required>
                  <Box mt='md'>
                    <Chip.Group value={releaseReasonId} onChange={setReleaseReasonId}>
                      <Stack gap='sm' align='flex-start'>
                        <Chip data-testid='release-reason-sobered' value='sobered'>Can care for themselves</Chip>
                        <Chip value='medical_issue'>Medical issue (physical)</Chip>
                        <Chip value='behavioral_health_evaluation'>Behavioral health evaluation</Chip>
                        <Chip value='other'>Other (please specify)</Chip>
                      </Stack>
                    </Chip.Group>
                  </Box>
                </Input.Wrapper>
                {isMedicalRelease && (
                  <>
                    <Text size='md' c='dimmed'>
                      This &lsquo;Medical issue (physical)&rsquo; release will also mark the person as exited from RESET
                    </Text>
                    <Input.Wrapper label='Exit destination' required>
                      <Chip.Group value={exitDestinationId} onChange={setExitDestinationId}>
                        <Group gap='sm'>
                          <Chip value='hospital'>Hospital</Chip>
                          <Chip value='other'>Other</Chip>
                        </Group>
                      </Chip.Group>
                    </Input.Wrapper>
                  </>
                )}
                {isOtherRelease && (
                  <>
                    <Textarea
                      label='Other release reason'
                      required
                      value={otherReason}
                      onChange={(event) => setOtherReason(event.currentTarget.value)}
                      minRows={1}
                      placeholder='For example: Facility emergency'
                    />
                    <Textarea
                      label='Other release destination'
                      required
                      value={otherDestination}
                      onChange={(event) => setOtherDestination(event.currentTarget.value)}
                      minRows={1}
                      placeholder='For example: Alternate care site'
                    />
                    <Text size='md' c='dimmed'>
                      For &ldquo;Other&rdquo;, add a reason and destination. This release will also mark the person as exited from RESET.
                    </Text>
                  </>
                )}
              </Stack>

              <Group gap='md' wrap='nowrap' align='flex-start'>
                <IconAlertCircle size={24} color='var(--mantine-color-indigo-6)' stroke={1.75} />
                <Text size='md'>When you confirm release, the 849(b) will be sent to SFSO supervisors.</Text>
              </Group>

              <Group>
                <Button variant='destructive' onClick={() => navigate(backTo)}>
                  Cancel
                </Button>
                <Button
                  data-testid='release-confirm-btn'
                  onClick={() => {
                    if (isEditingNarrative) {
                      saveNarrativeMutation.mutate(undefined, {
                        onSuccess: () => releaseMutation.mutate(),
                      });
                      return;
                    }
                    releaseMutation.mutate();
                  }}
                  loading={releaseMutation.isPending || saveNarrativeMutation.isPending}
                  disabled={
                    !releaseReasonId ||
                    (releaseReasonId === 'medical_issue' && !exitDestinationId) ||
                    (releaseReasonId === 'other' && (!otherReason.trim() || !otherDestination.trim())) ||
                    (releaseReasonId !== 'sobered' &&
                      releaseReasonId !== 'medical_issue' &&
                      releaseReasonId !== 'behavioral_health_evaluation' &&
                      releaseReasonId !== 'other')
                  }
                >
                  {isExitRelease ? 'Confirm release and exit' : 'Confirm release'}
                </Button>
              </Group>
            </>
          )}
          <Box h={8} />
        </Stack>
      </Container>
    </>
  );
}

export { RELEASE_TOAST_KEY };
export default LegalReleaseQuestions;
