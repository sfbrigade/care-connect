import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core';
import { inflect } from 'inflection';
import { useTranslation } from 'react-i18next';

const STATUS_BADGES = {
  OPEN_NOT_ACCEPTING: { label: 'Not accepting new holds', color: 'red' },
  CLOSED: { label: 'Temporarily closed', color: 'red' },
};

function CareFacilityCard ({ facility, bedTypes }) {
  const { t } = useTranslation();

  const badge = STATUS_BADGES[facility?.status];

  return (
    <Card bg='white' withBorder>
      <Stack gap='sm' align='center'>
        {badge && (
          <Badge color={badge.color} variant='light' size='lg'>
            {badge.label}
          </Badge>
        )}
        {bedTypes?.map(bedType => (
          <Stack key={bedType.id} gap='xs' align='center'>
            <Title order={3} c={bedType.available === 0 ? 'red.6' : undefined}>
              {bedType.available} {inflect(t(`bedType.${bedType.type}`).toLocaleLowerCase(), bedType.available)} available
            </Title>
            <Group gap='xs'>
              <Text size='sm' c='dimmed'>{bedType.holds} in transit</Text>
              <Text size='sm' c='dimmed'>|</Text>
              <Text size='sm' c='dimmed'>{bedType.occupied} occupied</Text>
            </Group>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}

export default CareFacilityCard;
