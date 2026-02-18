import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Card, Container, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';
import { IconQrcode } from '@tabler/icons-react';

import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { calculateAge, formatTime } from '@/utils/format';
import ScanTransferCodeModal from './ScanTransferCodeModal';

function CustodyCard ({ deflection }) {
  const { t } = useTranslation();
  const displayId = String(deflection.id).padStart(6, '0');
  const displayName = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown subject';

  let subjectAge;
  if (deflection?.subject?.dateOfBirth) {
    subjectAge = calculateAge(deflection?.subject?.dateOfBirth);
  }
  const subjectDetails = [];
  if (subjectAge) {
    subjectDetails.push(`${subjectAge} y.o.`);
  }
  if (deflection?.subject?.sex) {
    subjectDetails.push(t(`sex.${deflection?.subject?.sex}`));
  }

  return (
    <Card bg='white' p='xl' withBorder>
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
      </Stack>
    </Card>
  );
}

function Custody () {
  const [tab, setTab] = useState('in-custody');
  const [scanModalOpened, setScanModalOpened] = useState(false);
  const { facility } = useFacilityContext();
  const queryClient = useQueryClient();

  const { data: deflections, dataUpdatedAt } = useQuery({
    queryKey: ['deflections', facility.id, 'awaiting-intake'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, subjectStatus: 'AWAITING_INTAKE' }).then(response => response.data),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  function handleScanSuccess () {
    queryClient.invalidateQueries({ queryKey: ['deflections', facility.id, 'awaiting-intake'] });
  }

  return (
    <>
      <Head>
        <title>Custody</title>
      </Head>
      <Container>
        <Stack gap='xl'>
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={setTab}
            data={[
              { label: 'In Custody', value: 'in-custody' },
              { label: 'Released', value: 'released' },
            ]}
          />
          {tab === 'in-custody' && (
            <Stack gap='md'>
              {deflections?.map((deflection) => (
                <CustodyCard key={deflection.id} deflection={deflection} />
              ))}
              {deflections?.length === 0 && (
                <Text c='dimmed' ta='center'>No subjects in custody</Text>
              )}
              <Button
                variant='outline'
                fullWidth
                size='lg'
                leftSection={<IconQrcode size={20} />}
                onClick={() => setScanModalOpened(true)}
              >
                Scan a custody transfer code
              </Button>
              {dataUpdatedAt > 0 && (
                <Group justify='center'>
                  <Text size='sm' c='dimmed'>Updated at {formatTime(DateTime.fromMillis(dataUpdatedAt).toISO())}</Text>
                </Group>
              )}
            </Stack>
          )}
          {tab === 'released' && (
            <>
              <Text c='dimmed' ta='center'>No released subjects</Text>
            </>
          )}
        </Stack>
      </Container>
      <ScanTransferCodeModal
        opened={scanModalOpened}
        onClose={() => setScanModalOpened(false)}
        onSuccess={handleScanSuccess}
      />
    </>
  );
}

export default Custody;
