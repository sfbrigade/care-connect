import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Anchor, Box, Button, Chip, Container, Group, Input, Stack, Text, Textarea, Title } from '@mantine/core';
import { Head } from '@unhead/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { IconArrowLeft } from '@tabler/icons-react';

const RELEASE_TOAST_KEY = 'custodyReleaseToast';

function formatNarrativeDate (value) {
  if (!value) return '[Arrest date & time]';
  const jsDate = new Date(value);
  if (Number.isNaN(jsDate.getTime())) return '[Arrest date & time]';
  const dt = DateTime.fromJSDate(jsDate);
  if (!dt.isValid) return '[Arrest date & time]';
  return dt.toLocaleString(DateTime.DATETIME_MED);
}

function buildDefaultNarrative (deflection) {
  const arrestDate = formatNarrativeDate(deflection?.createdAt);
  return `Person was brought to RESET at ${arrestDate} because they were found to be under the influence of a controlled substance or alcohol in a public location. Upon being able to care for themselves, they were released from their detention at [Release date & time].`;
}

function LegalReleaseQuestions () {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const backTo = searchParams.get('from') === 'detail'
    ? `/custody/${id}`
    : '/custody';

  const [releaseReasonId, setReleaseReasonId] = useState(null);
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);
  const [narrativeDraft, setNarrativeDraft] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [otherDestination, setOtherDestination] = useState('');
  const [exitDestinationId, setExitDestinationId] = useState(null);

  const isMedicalRelease = releaseReasonId === 'medical_issue';
  const isOtherRelease = releaseReasonId === 'other';
  const isExitRelease = isMedicalRelease || isOtherRelease;

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const narrativeText = useMemo(() => {
    if (!deflection) return '';
    return deflection.behavior || buildDefaultNarrative(deflection);
  }, [deflection]);

  useEffect(() => {
    setNarrativeDraft(narrativeText);
  }, [narrativeText]);

  const saveNarrativeMutation = useMutation({
    mutationFn: () => Api.deflections.update(id, { behavior: narrativeDraft }),
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
        showToast('Exit recorded', 'success', 4000, 'Person now appears in Exited facility under Not in custody (last 24 hours).');
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
        <IconButtonLink icon={IconArrowLeft} to={backTo} />
      </Header>
      <Container>
        <Stack gap='xl'>
          <Stack gap={0}>
            <Text size='xl' c='dimmed'>Confirm legal release</Text>
            <Title order={3}>Review the 849(b) and choose a release reason. After you confirm, it&apos;s sent to SFSO supervisors and can&apos;t be changed.</Title>
          </Stack>

          <Stack gap='xs'>
            <Text size='md' fz='md' c='dimmed'>849(b) narrative</Text>
            {!isEditingNarrative && <Text size='md' fz='md'>{narrativeText}</Text>}
            {isEditingNarrative && (
              <Textarea
                value={narrativeDraft}
                onChange={(event) => setNarrativeDraft(event.currentTarget.value)}
                minRows={6}
                autosize
              />
            )}
            {!isEditingNarrative && (
              <Anchor onClick={() => setIsEditingNarrative(true)}>
                Edit narrative
              </Anchor>
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

          <Stack gap='xl'>
            <Input.Wrapper label='Release reason' required>
              <Chip.Group value={releaseReasonId} onChange={setReleaseReasonId}>
                <Group gap='sm'>
                  <Chip value='sobered'>Can care for themselves</Chip>
                  <Chip value='medical_issue'>Medical issue</Chip>
                  <Chip value='other'>Other (please specify)</Chip>
                </Group>
              </Chip.Group>
            </Input.Wrapper>
            {isMedicalRelease && (
              <>
                <Text size='md' c='dimmed'>
                  This &lsquo;Medical issue&rsquo; release will also mark the person as exited from RESET
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

          <Group>
            <Button variant='destructive' onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button
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
                (releaseReasonId !== 'sobered' && releaseReasonId !== 'medical_issue' && releaseReasonId !== 'other')
              }
            >
              {isExitRelease ? 'Confirm release and exit' : 'Confirm release'}
            </Button>
          </Group>
          <Box h={8} />
        </Stack>
      </Container>
    </>
  );
}

export { RELEASE_TOAST_KEY };
export default LegalReleaseQuestions;
