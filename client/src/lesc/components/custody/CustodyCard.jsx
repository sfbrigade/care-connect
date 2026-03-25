import { Button, Card, Group, Stack, Text, Title, Box } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';

import Api from '../../../Api';
import { useFacilityContext } from '../../../FacilityContext';
import { useToast } from '../../../components/ToastContext';
import { calculateAge } from '../../../utils/format';

function CustodyCard ({ deflection, highlighted }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();

  const displayId = String(deflection.id);
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown person';

  const subjectDetails = [];
  if (deflection?.subject?.dateOfBirth) {
    subjectDetails.push(`${calculateAge(deflection.subject.dateOfBirth)} y.o.`);
  }
  if (deflection?.subject?.sex) {
    subjectDetails.push(t(`sex.${deflection.subject.sex}`));
  }

  const isFailedIntake = deflection.subjectStatus === 'FAILED_INTAKE';
  const showViewDetails = deflection.subjectStatus !== 'EXITED';
  const showMarkComplete = deflection.subjectStatus === 'AWAITING_INTAKE';
  const showLegalRelease = deflection.subjectStatus === 'FAILED_INTAKE';
  const showQrCode = deflection.subjectStatus === 'READY_FOR_INTAKE';

  const safetyCheckMutation = useMutation({
    mutationFn: () => Api.deflections.safetyCheck(deflection.id),
    onSuccess: () => {
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflection.id));
      window.sessionStorage.setItem('custodyInCustodySectionTarget', 'READY_FOR_INTAKE');
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      showToast('Safety check completed', 'success', 4000, 'Person is ready for medical intake.');
    },
    onError: () => {
      showToast('Safety check not saved. Please try again.', 'error');
    },
  });

  return (
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
          {isFailedIntake && (
            <Text size='md' c='red.6'>Intake not completed</Text>
          )}
          <Group gap='xs' wrap='nowrap'>
            <Text size='md' c='gray.6'>Hold {displayId}</Text>
            {isFailedIntake && (
              <>
                <Text size='md' c='gray.5'>&middot;</Text>
                <Text size='md' c='gray.6'>Pending safety check</Text>
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
              onClick={() => {
                window.sessionStorage.setItem('custodyScrollTarget', deflection.id);
                navigate(`/custody/${deflection.id}`);
              }}
            >
              View details
            </Button>
          )}
          {showMarkComplete && (
            <Button
              onClick={() => safetyCheckMutation.mutate()}
              loading={safetyCheckMutation.isPending}
            >
              Safety checked
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
        </Group>
      </Stack>
    </Card>
  );
}

export default CustodyCard;
