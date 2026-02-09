import { Button, Card, Group, Stack, Text, Title, Box } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { calculateAge } from '@/utils/format';

function CareCard ({ deflection, highlighted }) {
  const { t } = useTranslation();

  const displayId = String(deflection.id).padStart(6, '0');
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown subject';

  const subjectDetails = [];
  if (deflection?.subject?.dateOfBirth) {
    subjectDetails.push(`${calculateAge(deflection.subject.dateOfBirth)} y.o.`);
  }
  if (deflection?.subject?.sex) {
    subjectDetails.push(t(`sex.${deflection.subject.sex}`));
  }

  return (
    <Card bg='white' p={{ base: 'md', sm: 'xl' }} withBorder id={`care-card-${deflection.id}`} style={highlighted ? { animation: 'cardHighlight 3s ease-out' } : undefined}>
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
        <Group wrap='nowrap' justify='flex-end'>
          <Button
            size='md'
            variant='light'
            onClick={() => {
              window.sessionStorage.setItem('careScrollTarget', deflection.id);
            }}
          >
            View details
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

export default CareCard;
