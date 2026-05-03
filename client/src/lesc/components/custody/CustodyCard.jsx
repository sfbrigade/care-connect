import { useState } from 'react';
import { Button, Card, Group, Stack, Text, Title, Box } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';

import Api from '../../../Api';
import { useFacilityContext } from '../../../FacilityContext';
import { useToast } from '../../../components/ToastContext';
import useSubjectDetails from '@/hooks/useSubjectDetails';
import { releaseTiming } from '../../../utils/releaseTiming';
import ExitToJailModal from './ExitToJailModal';
import SafetyCheckResultModal from './SafetyCheckResultModal';

function isNetworkError (error) {
  return !error?.response || window.navigator?.onLine === false;
}

function CustodyCard ({ deflection, highlighted }) {
  const [safetyCheckResultModalOpened, setSafetyCheckResultModalOpened] = useState(false);
  const [exitToJailModalOpened, setExitToJailModalOpened] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();

  const displayId = String(deflection.id);
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown person';
  const subjectDetails = useSubjectDetails(deflection?.subject);

  const isFailedIntake = deflection.subjectStatus === 'FAILED_INTAKE';
  const isInChair = deflection.subjectStatus === 'IN_CHAIR';
  const showViewDetails = deflection.subjectStatus !== 'EXITED';
  const showMarkComplete = deflection.subjectStatus === 'AWAITING_INTAKE';
  const showLegalRelease = deflection.subjectStatus === 'FAILED_INTAKE';
  const showStartRelease = isInChair;
  const showQrCode = deflection.subjectStatus === 'READY_FOR_INTAKE';
  const releaseTimingChip = releaseTiming(deflection);

  const safetyCheckMutation = useMutation({
    mutationFn: () => Api.deflections.safetyCheck(deflection.id),
    onSuccess: () => {
      setSafetyCheckResultModalOpened(false);
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflection.id));
      window.sessionStorage.setItem('custodyInCustodySectionTarget', 'READY_FOR_INTAKE');
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      showToast('Safety check completed', 'success', 4000, 'Person is ready for medical intake.');
    },
    onError: (error) => {
      setSafetyCheckResultModalOpened(false);
      if (isNetworkError(error)) {
        showToast('Safety check saved offline. We’ll sync when connection is back.', 'warning');
        return;
      }
      showToast('Safety check not saved. Please try again.', 'error');
    },
  });

  const exitToJailMutation = useMutation({
    mutationFn: () => Api.deflections.exitToJail(deflection.id),
    onSuccess: () => {
      setExitToJailModalOpened(false);
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflection.id));
      window.sessionStorage.setItem('custodyReleasedSectionTarget', 'TRANSFERRED_TO_JAIL');
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
      showToast('Exit recorded', 'success', 4000, 'Person moved to "Transferred to jail" under "Legally released".');
      navigate('/custody?tab=released');
    },
    onError: () => {
      showToast('Couldn\'t record exit', 'error', 4000, 'Please check your connection and try again.');
    },
  });

  return (
    <>
      <Card
        bg='white'
        p='xl'
        withBorder
        id={`custody-card-${deflection.id}`}
        style={{
          borderColor: highlighted ? 'var(--mantine-color-indigo-6)' : undefined,
          animation: highlighted ? 'cardHighlight 3s ease-out' : undefined,
        }}
      >
        <Stack gap='2xl'>
          <Stack gap='sm'>
            <Group gap='xs' wrap='nowrap'>
              <Text size='md' c='gray.6'>Hold {displayId}</Text>
              {isFailedIntake && (
                <>
                  <Text size='md' c='gray.5'>&middot;</Text>
                  <Text size='md' c='red.6'>Intake not completed</Text>
                </>
              )}
              {releaseTimingChip && (
                <>
                  <Text size='md' c='gray.5'>&middot;</Text>
                  <Text size='md' c={releaseTimingChip.tone === 'danger' ? 'red.6' : 'yellow.6'}>{releaseTimingChip.label}</Text>
                </>
              )}
            </Group>
            <Box>
              <Title order={3}>{displayName}</Title>
              {subjectDetails.length > 0 && (
                <Text size='md'>
                  {subjectDetails.join(', ')}
                </Text>
              )}
            </Box>
          </Stack>
          {showQrCode && (
            <Stack align='center' gap='xs'>
              <QRCodeSVG value={`${window.location.origin}/admit/${deflection.id}`} size={160} />
              <Text size='sm' c='dimmed'>Transfer code: {deflection.id}</Text>
            </Stack>
          )}
          <Group wrap='nowrap' justify='flex-end'>
            {showViewDetails && (
              <Button
                variant='secondary'
                size='md'
                onClick={() => {
                  window.sessionStorage.setItem('custodyScrollTarget', deflection.id);
                  navigate(`/custody/${deflection.id}`);
                }}
              >
                Details
              </Button>
            )}
            {showMarkComplete && (
              <Button
                size='md'
                onClick={() => setSafetyCheckResultModalOpened(true)}
              >
                Safety check
              </Button>
            )}
            {showLegalRelease && (
              <Button
                size='md'
                onClick={() => navigate(`/custody/${deflection.id}/legal-release`)}
              >
                Legal release
              </Button>
            )}
            {showStartRelease && (
              <Button
                size='md'
                onClick={() => navigate(`/custody/${deflection.id}/legal-release`)}
              >
                Start release
              </Button>
            )}
          </Group>
        </Stack>
      </Card>
      <SafetyCheckResultModal
        opened={safetyCheckResultModalOpened}
        onClose={() => setSafetyCheckResultModalOpened(false)}
        loading={safetyCheckMutation.isPending}
        onConfirmPassed={() => safetyCheckMutation.mutate()}
        onConfirmFailed={() => {
          setSafetyCheckResultModalOpened(false);
          setExitToJailModalOpened(true);
        }}
      />
      <ExitToJailModal
        opened={exitToJailModalOpened}
        onClose={() => setExitToJailModalOpened(false)}
        onConfirm={() => exitToJailMutation.mutate()}
        loading={exitToJailMutation.isPending}
      />
    </>
  );
}

export default CustodyCard;
