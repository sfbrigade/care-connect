import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Box, Button, Chip, Container, Group, Stack, Text, Textarea, Title } from '@mantine/core';
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

  const [releaseReason, setReleaseReason] = useState(null);
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);
  const [narrativeDraft, setNarrativeDraft] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [medicalExitDestination, setMedicalExitDestination] = useState(null);

  const isMedicalRelease = releaseReason === 'medical_issue';

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
        releaseReason: releaseReason === 'medical_issue'
          ? 'MEDICAL_ISSUE'
          : (releaseReason === 'other' ? 'OTHER' : 'SOBERED'),
      };

      if (isMedicalRelease) {
        payload.exitDestination = medicalExitDestination === 'hospital' ? 'HOSPITAL' : 'OTHER';
      }

      return Api.deflections.release(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deflections', String(id)] });
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
      if (isMedicalRelease) {
        showToast('Exit recorded', 'success', 4000, 'Person now appears in Exited facility under Not in custody (last 24 hours).');
        navigate(backTo);
        return;
      }
      window.sessionStorage.setItem(RELEASE_TOAST_KEY, JSON.stringify({
        variant: 'success',
        title: 'Person legally released',
        body: '849(b) record finalized. Please print the release certificate.',
      }));
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
            <Text size='xl' fz='xl' c='dimmed'>Confirm legal release</Text>
            <Title order={2} fz={24} lh='32px'>Review the 849(b) and choose a release reason. After you confirm, it&apos;s sent to SFSO supervisors and can&apos;t be changed.</Title>
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
              <Button
                variant='transparent'
                color='indigo'
                size='md'
                fz='md'
                p={0}
                h='auto'
                w='fit-content'
                style={{ lineHeight: '24px', alignSelf: 'flex-start' }}
                onClick={() => setIsEditingNarrative(true)}
              >
                Edit narrative
              </Button>
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

          <Stack gap='sm'>
            <Text fw={600} size='lg'>Release reason<Text span c='red.6'>*</Text></Text>
            <Chip.Group value={releaseReason} onChange={setReleaseReason}>
              <Stack gap='sm' align='flex-start'>
                <Chip value='sobered'>Sobered</Chip>
                <Chip value='medical_issue'>Medical issue</Chip>
                <Chip value='other'>Other (please specify)</Chip>
              </Stack>
            </Chip.Group>
            {isMedicalRelease && (
              <>
                <Text size='lg' fz={24} lh='32px'>
                  This &lsquo;Medical issue&rsquo; release will also mark the person as exited from RESET
                </Text>
                <Stack gap='sm'>
                  <Text fw={600} size='lg'>Exit destination<Text span c='red.6'>*</Text></Text>
                  <Chip.Group value={medicalExitDestination} onChange={setMedicalExitDestination}>
                    <Group gap='sm'>
                      <Chip value='hospital'>Hospital</Chip>
                      <Chip value='other'>Other</Chip>
                    </Group>
                  </Chip.Group>
                </Stack>
              </>
            )}
            {releaseReason === 'other' && (
              <Textarea
                value={otherReason}
                onChange={(event) => setOtherReason(event.currentTarget.value)}
                minRows={3}
                placeholder='Please specify'
              />
            )}
          </Stack>

          <Group>
            <Button color='red' variant='light' onClick={() => navigate(backTo)}>
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
                !releaseReason ||
                (releaseReason === 'medical_issue' && !medicalExitDestination) ||
                (releaseReason !== 'sobered' && releaseReason !== 'medical_issue')
              }
            >
              {isMedicalRelease ? 'Confirm release and exit' : 'Confirm release'}
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
