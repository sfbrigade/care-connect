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

  return (
    <Card bg='white' p='xl' withBorder id={`custody-card-${deflection.id}`} style={highlighted ? { animation: 'cardHighlight 3s ease-out' } : undefined}>
      <Stack gap='sm'>
        <Text size='md' c='gray.6'>Hold {displayId}</Text>
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
        <Group wrap='nowrap' gap='xs' grow mt='xl'>
          <Button
            size='md'
            px='md'
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
            <Button size='md' px='md' onClick={() => safetyCheckMutation.mutate()} loading={safetyCheckMutation.isPending}>Mark complete</Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export default CustodyCard;
