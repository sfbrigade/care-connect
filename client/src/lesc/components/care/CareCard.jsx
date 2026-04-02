import { Button, Card, Group, Stack, Text, Title, Box } from '@mantine/core';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import { calculateAge } from '../../../utils/format';
import { releaseTiming } from '../../../utils/releaseTiming';
import { shouldShowCareCardViewDetails } from './careFlowUtils';

function CareCard ({ deflection, highlighted, onCompleteIntake, onExitDetails, hasExitDraft = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const displayId = String(deflection.id);
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown person';

  const subjectDetails = [];
  if (deflection?.subject?.dateOfBirth) {
    subjectDetails.push(`${calculateAge(deflection.subject.dateOfBirth)} y.o.`);
  }
  if (deflection?.subject?.sex) {
    subjectDetails.push(t(`sex.${deflection.subject.sex}`));
  }

  const isInMedicalIntake = deflection.subjectStatus === 'ADMITTED';
  const isReleased = deflection.subjectStatus === 'RELEASED';
  const releaseTimingChip = releaseTiming(deflection);
  const showViewDetails = shouldShowCareCardViewDetails(deflection);

  return (
    <Card
      bg='white'
      p='xl'
      id={`care-card-${deflection.id}`}
      style={{
        border: highlighted
          ? '1px solid var(--mantine-color-indigo-6)'
          : '1px solid var(--mantine-color-gray-3)',
        borderRadius: '16px',
        animation: highlighted ? 'cardHighlight 3s ease-out' : undefined,
      }}
    >
      <Stack gap='lg'>
        <Text size='md' c='gray.6'>
          Hold {displayId}
          {releaseTimingChip && (
            <>
              {' · '}
              <Text span c={releaseTimingChip.tone === 'danger' ? 'red.6' : 'yellow.6'}>{releaseTimingChip.label}</Text>
            </>
          )}
        </Text>

        <Box>
          <Title order={3}>{displayName}</Title>
          {subjectDetails.length > 0 && (
            <Text size='md'>
              {subjectDetails.join(', ')}
            </Text>
          )}
        </Box>

        <Group wrap='nowrap' justify='flex-end'>
          {showViewDetails && (
            <Button
              variant='secondary'
              onClick={() => navigate(`/care/${deflection.id}`)}
            >
              View details
            </Button>
          )}
          {isInMedicalIntake && (
            <Button onClick={onCompleteIntake}>Complete intake</Button>
          )}
          {isReleased && (
            <Button onClick={onExitDetails}>{hasExitDraft ? 'Finish exit' : 'Start exit'}</Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export default CareCard;
