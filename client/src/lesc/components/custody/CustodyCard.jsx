import { Button, Card, Center, Group, Stack, Text, Title, Box } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { calculateAge } from '@/utils/format';

function CustodyCard ({ deflection }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { facility } = useFacilityContext();

  const displayId = String(deflection.id).padStart(6, '0');
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown subject';

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
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
    },
  });

  return (
    <Card bg='white' p={{ base: 'md', sm: 'xl' }} withBorder id={`custody-card-${deflection.id}`}>
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
          <Center>
            <QRCodeSVG value={`${window.location.origin}/admit/${deflection.id}`} size={160} />
          </Center>
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
        </Group>
      </Stack>
    </Card>
  );
}

export default CustodyCard;
