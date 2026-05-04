import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, Button, Card, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core';
import { DateTime } from 'luxon';
import { Link } from 'react-router';

import Api from '@/Api';
import { useToast } from '@/components/ToastContext';
import { facilityLiveQueryOptions } from '@/hooks/facilityLiveQueryOptions';
import useNow from '@/hooks/useNow';
import useSubjectDetails from '@/hooks/useSubjectDetails';
import { formatTimeRemaining } from '@/utils/format';

function isCurrentlyActiveHold (hold, now) {
  if (!hold || hold.status !== 'ACTIVE') return false;
  if (!hold.expiresAt) return true;

  const expiresAt = DateTime.fromISO(hold.expiresAt);
  return !expiresAt.isValid || expiresAt >= now;
}

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

  const isCancelled = deflection.status === 'CANCELLED';

  return (
    <Card withBorder shadow='sm' radius='md' p='lg'>
      <Stack gap='xs'>
        {!isCancelled && (
          <Text ta='center' c='dimmed' size='sm'>{officerName}</Text>
        )}
        <Group gap='xs'>
          <Text size='sm' c='dimmed'>Hold {deflection.id}</Text>
          {isCancelled && (
            <>
              <Text size='sm' c='dimmed'>·</Text>
              <Text size='sm' c='red'>Cancelled by {facilityName}</Text>
            </>
          )}
        </Group>
        <Title order={4}>{personName}</Title>
        {subjectDetails.length > 0 && (
          <Text size='sm'>{subjectDetails.join(', ')}</Text>
        )}
        {!isCancelled && (
          <Group justify='space-between' align='center'>
            <Text fw={500}>{formatTimeRemaining(deflection.expiresAt, now)}</Text>
            <Button variant='destructive' size='sm' onClick={() => onCancelClick(deflection)}>
              Cancel hold
            </Button>
          </Group>
        )}
        {isCancelled && (
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
  const now = useNow(1000, true);

  const { data: holds, isLoading, isFetching } = useQuery({
    queryKey: ['deflections', facility.id, 'manage-holds'],
    queryFn: () => Api.deflections.list({
      facilityId: facility.id,
      active: 'true',
      subjectStatus: 'DETAINED,ONSITE_AWAITING_TRANSFER',
      perPage: 1000,
    }).then(r => r.data),
    ...facilityLiveQueryOptions,
  });

  const inTransitHolds = (holds ?? []).filter(
    hold => isCurrentlyActiveHold(hold, now) && hold.subjectStatus === 'DETAINED'
  );
  const awaitingCustodyTransferHolds = (holds ?? []).filter(
    hold => isCurrentlyActiveHold(hold, now) && hold.subjectStatus === 'ONSITE_AWAITING_TRANSFER'
  );
  const showEmptyInTransit = !isLoading && !isFetching && inTransitHolds.length === 0;
  const showEmptyAwaitingCustodyTransfer = !isLoading && !isFetching && awaitingCustodyTransferHolds.length === 0;

  const cancelMutation = useMutation({
    mutationFn: (id) => Api.deflections.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id, 'manage-holds'] });
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id, 'awaiting-custody-transfer'] });
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
        <Accordion
          variant='contained'
          chevronPosition='left'
          multiple
          defaultValue={['holds-in-transit', 'holds-awaiting-custody-transfer']}
        >
          <Accordion.Item value='holds-in-transit'>
            <Accordion.Control>
              <Title order={4}>Holds in transit</Title>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap='md'>
                {showEmptyInTransit && (
                  <Text c='dimmed'>No holds in transit.</Text>
                )}

                {inTransitHolds.map((hold) => (
                  <HoldCard
                    key={hold.id}
                    deflection={hold}
                    facilityName={facility.name}
                    onCancelClick={setCancelTarget}
                  />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value='holds-awaiting-custody-transfer'>
            <Accordion.Control>
              <Title order={4}>Holds awaiting custody transfer</Title>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap='md'>
                {showEmptyAwaitingCustodyTransfer && (
                  <Text c='dimmed'>No holds awaiting custody transfer.</Text>
                )}

                {awaitingCustodyTransferHolds.map((hold) => (
                  <HoldCard
                    key={hold.id}
                    deflection={hold}
                    facilityName={facility.name}
                    onCancelClick={setCancelTarget}
                  />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
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
