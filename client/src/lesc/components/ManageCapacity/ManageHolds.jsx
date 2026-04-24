import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

import Api from '@/Api';
import { useToast } from '@/components/ToastContext';
import useNow from '@/hooks/useNow';
import useSubjectDetails from '@/hooks/useSubjectDetails';
import { formatTimeRemaining } from '@/utils/format';

function HoldCard ({ deflection, facilityName, onCancelClick }) {
  const now = useNow(1000, deflection.status === 'ACTIVE' && !!deflection.expiresAt);

  const personName = [
    deflection.subject?.firstName,
    deflection.subject?.middleInitial,
    deflection.subject?.lastName,
  ].filter(Boolean).join(' ') || 'Unknown';
  const subjectDetails = useSubjectDetails(deflection.subject);

  const officerName = [
    deflection.createdBy?.firstName,
    deflection.createdBy?.lastName,
  ].filter(Boolean).join(' ') || 'Unknown officer';

  const isCanceled = deflection.status === 'CANCELED';

  return (
    <Card withBorder shadow='sm' radius='md' p='lg'>
      <Stack gap='xs'>
        {!isCanceled && (
          <Text ta='center' c='dimmed' size='sm'>{officerName}</Text>
        )}
        <Group gap='xs'>
          <Text size='sm' c='dimmed'>Hold {deflection.id}</Text>
          {isCanceled && (
            <>
              <Text size='sm' c='dimmed'>·</Text>
              <Text size='sm' c='red'>Canceled by {facilityName}</Text>
            </>
          )}
        </Group>
        <Title order={4}>{personName}</Title>
        {subjectDetails.length > 0 && (
          <Text size='sm'>{subjectDetails.join(', ')}</Text>
        )}
        {!isCanceled && (
          <Group justify='space-between' align='center'>
            <Text fw={500}>{formatTimeRemaining(deflection.expiresAt, now)}</Text>
            <Button variant='destructive' size='sm' onClick={() => onCancelClick(deflection)}>
              Cancel hold
            </Button>
          </Group>
        )}
        {isCanceled && (
          <Group justify='flex-end'>
            <Button variant='secondary' size='sm' component={Link} to={`/holds/${deflection.id}`}>
              Details
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}

function ManageHolds ({ facility }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data: holds, isLoading } = useQuery({
    queryKey: ['deflections', facility.id, 'manage-holds'],
    queryFn: () => Api.deflections.list({
      facilityId: facility.id,
      subjectStatus: 'DETAINED,ONSITE_AWAITING_TRANSFER',
    }).then(r => r.data),
    refetchOnMount: 'always',
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => Api.deflections.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id, 'in-transit'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'bed-types'] });
      showToast('Hold canceled', 'success', 4000, 'Officer notified.');
      setCancelTarget(null);
    },
    onError: () => {
      showToast("Couldn't cancel hold", 'error', 4000, 'Please try again.');
      setCancelTarget(null);
    },
  });

  const cancelTargetName = cancelTarget
    ? [cancelTarget.subject?.firstName, cancelTarget.subject?.lastName].filter(Boolean).join(' ') || 'this person'
    : '';

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <Stack>
        <Title order={4}>Holds in transit</Title>

        {holds?.length === 0 && (
          <Text c='dimmed'>No holds in transit.</Text>
        )}

        {holds?.map((hold) => (
          <HoldCard
            key={hold.id}
            deflection={hold}
            facilityName={facility.name}
            onCancelClick={setCancelTarget}
          />
        ))}
      </Stack>

      <Modal
        opened={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={null}
        centered
        lockScroll
        withCloseButton={false}
        size='sm'
      >
        <Stack gap='xl'>
          <Stack gap='sm'>
            <Title order={4}>Cancel hold for {cancelTargetName}?</Title>
            <Text size='sm' c='dimmed'>This will notify the officer who created the hold.</Text>
          </Stack>
          <Group grow>
            <Button
              variant='subtle'
              color='pink'
              onClick={() => setCancelTarget(null)}
              disabled={cancelMutation.isPending}
            >
              Keep hold
            </Button>
            <Button
              onClick={() => cancelMutation.mutateAsync(cancelTarget.id)}
              loading={cancelMutation.isPending}
            >
              Cancel hold
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export default ManageHolds;
