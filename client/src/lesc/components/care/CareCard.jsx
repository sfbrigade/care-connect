import { Button, Card, Group, Stack, Text, Title, Box } from '@mantine/core';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { calculateAge } from '../../../utils/format';
import { shouldShowCareCardViewDetails } from './careFlowUtils';

function CareCard ({ deflection, highlighted, onCompleteIntake, onExitDetails, hasExitDraft = false }) {
  const { t } = useTranslation();

  const displayId = String(deflection.id).padStart(6, '0');
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
        <Text size='md' c='gray.6'>Hold {displayId}</Text>

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
            <Button component={Link} to={`/care/${deflection.id}`} size='md' variant='light' color='indigo'>View details</Button>
          )}
          {isInMedicalIntake && (
            <Button size='md' color='indigo' onClick={onCompleteIntake}>Complete intake</Button>
          )}
          {isReleased && (
            <Button size='md' color='indigo' onClick={onExitDetails}>{hasExitDraft ? 'Finish exit' : 'Start exit'}</Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export default CareCard;
