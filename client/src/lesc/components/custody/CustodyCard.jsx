import { Button, Card, Group, Stack, Text, Title, Box } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { useToast } from '@/components/ToastContext';
import { calculateAge } from '@/utils/format';

function CustodyCard ({ deflection, highlighted }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();

  const displayId = String(deflection.id).padStart(6, '0');
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown person';

  const subjectDetails = [];
  if (deflection?.subject?.dateOfBirth) {
    subjectDetails.push(`${calculateAge(deflection.subject.dateOfBirth)} y.o.`);
  }
  if (deflection?.subject?.sex) {
    subjectDetails.push(t(`sex.${deflection.subject.sex}`));
  }

  const isFailedIntake = deflection.subjectStatus === 'FAILED_INTAKE';

  const safetyCheckMutation = useMutation({
    mutationFn: () => Api.deflections.safetyCheck(deflection.id),
    onSuccess: () => {
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflection.id));
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      showToast('Safety check completed', 'success', 4000, 'Person is ready for medical intake.');
    },
    onError: () => {
      showToast('Safety check not saved. Please try again.', 'error');
    },
  });

  const legalReleaseMutation = useMutation({
    mutationFn: () => Api.deflections.release(deflection.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      showToast('Person legally released', 'success');
    },
    onError: () => {
      showToast('Release not saved. Please try again.', 'error');
    },
  });

  return (
    <Card
      bg='white'
      p={{ base: 'md', sm: 'xl' }}
      withBorder
      id={`custody-card-${deflection.id}`}
      style={{
        borderColor: highlighted ? 'var(--mantine-color-indigo-6)' : undefined,
        animation: highlighted ? 'cardHighlight 3s ease-out' : undefined,
      }}
    >
      <Stack gap='sm'>
        {!isFailedIntake && (
          <Text size='md' c='gray.6'>Hold {displayId}</Text>
        )}
        {isFailedIntake && (
          <Group gap={4} wrap='nowrap'>
            <Text size='md' c='gray.6'>Hold {displayId}</Text>
            <Text size='md' c='gray.5'>&middot;</Text>
            <Text size='md' c='red.6'>Intake not completed</Text>
          </Group>
        )}
        <Box>
          <Title order={3}>{displayName}</Title>
          {subjectDetails.length > 0 && (
            <Text size='md'>
              {subjectDetails.join(', ')}
            </Text>
          )}
        </Box>
        {deflection.subjectStatus === 'READY_FOR_INTAKE' && (
          <Stack align='center' gap='xs'>
            <QRCodeSVG value={`${window.location.origin}/admit/${deflection.id}`} size={160} />
            <Text size='sm' c='dimmed'>Transfer code: {deflection.id}</Text>
          </Stack>
        )}
        <Group wrap='nowrap' justify='flex-end'>
          <Button
            size='md'
            variant='light'
            onClick={() => {
              window.sessionStorage.setItem('custodyScrollTarget', deflection.id);
              window.sessionStorage.setItem('custodyTab', searchParams.get('tab') || 'in-custody');
              navigate(`/custody/${deflection.id}`);
            }}
          >
            View details
          </Button>
          {deflection.subjectStatus === 'AWAITING_INTAKE' && (
            <Button size='md' onClick={() => safetyCheckMutation.mutate()} loading={safetyCheckMutation.isPending}>Mark complete</Button>
          )}
          {isFailedIntake && (
            <Button
              size='md'
              onClick={() => legalReleaseMutation.mutate()}
              loading={legalReleaseMutation.isPending}
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
