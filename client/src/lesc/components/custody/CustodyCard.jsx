import { useState } from 'react';
import { Button, Card, Group, Stack, Text, Title, Box } from '@mantine/core';
import { useNavigate } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';

import { useFacilityContext } from '../../../FacilityContext';
import useSubjectDetails from '@/hooks/useSubjectDetails';
import { releaseTiming } from '../../../utils/releaseTiming';
import ExitToJailModal from './ExitToJailModal';
import SafetyCheckResultModal from './SafetyCheckResultModal';

function CustodyCard ({ deflection, highlighted, onExitToJail }) {
  const [safetyCheckResultModalOpened, setSafetyCheckResultModalOpened] = useState(false);
  const [exitToJailModalOpened, setExitToJailModalOpened] = useState(false);
  const navigate = useNavigate();
  const { facility } = useFacilityContext();

  const displayId = String(deflection.id);
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown person';
  const subjectDetails = useSubjectDetails(deflection?.subject);

  const isFailedIntake = deflection.subjectStatus === 'FAILED_INTAKE';
  const isInChair = deflection.subjectStatus === 'IN_CHAIR';
  const showMarkComplete = deflection.subjectStatus === 'AWAITING_INTAKE';
  const showLegalRelease = deflection.subjectStatus === 'FAILED_INTAKE';
  const showStartRelease = isInChair;
  const showQrCode = deflection.subjectStatus === 'READY_FOR_INTAKE';
  const releaseTimingChip = releaseTiming(deflection);

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
                Release and exit
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
        deflectionId={deflection.id}
        facilityId={facility.id}
        opened={safetyCheckResultModalOpened}
        onClose={() => setSafetyCheckResultModalOpened(false)}
        onConfirmPassed={() => setSafetyCheckResultModalOpened(false)}
        onConfirmFailed={() => {
          setSafetyCheckResultModalOpened(false);
          setExitToJailModalOpened(true);
        }}
      />
      <ExitToJailModal
        deflectionId={deflection.id}
        facilityId={facility.id}
        opened={exitToJailModalOpened}
        onClose={() => setExitToJailModalOpened(false)}
        onConfirm={() => onExitToJail()}
      />
    </>
  );
}

export default CustodyCard;
