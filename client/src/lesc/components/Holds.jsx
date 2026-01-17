import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Container, Loader, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router';
import { IconAlertCircle } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';

import Api from '@/Api';
import CancelHoldModal from './CancelHoldModal';
import HoldQRCode from './HoldQRCode';
import Facility from './Facility';
import Incident from './Incident';
import Hold from './Hold';
import { useToast } from '@/components/ToastContext';
import { useHoldActions } from '@/lesc/hooks/useHoldActions';

import { useFacilityContext } from '@/FacilityContext';

function Holds () {
  const navigate = useNavigate();
  const { facility } = useFacilityContext();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: bedTypes } = useQuery({
    queryKey: ['facilities', facility.id, 'bed-types'],
    queryFn: () => Api.facilities.bedTypes.index(facility.id).then(response => response.data),
  });

  const { data: incident } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });

  const { data: deflections, isLoading, error } = useQuery({
    queryKey: ['incidents', incident?.id, 'deflections'],
    queryFn: () => Api.incidents.deflections(incident.id).then(response => response.data),
    enabled: !!incident,
  });

  // Use shared hold actions hook
  const {
    cancelModalOpened,
    qrModalOpened,
    selectedHold,
    setSelectedHold,
    // handleCancel,
    handleConfirmCancel,
    // handleTransfer,
    // handleExtend,
    handleCloseQRModal,
    handleQRDone,
    cancelMutation,
    closeCancelModal,
    closeQRModal,
  } = useHoldActions({
    invalidateQueries: [
      ['facilities', facility.id, 'bed-types'],
      ['facilities', facility.id, 'active-incident'],
      ['incidents', incident?.id, 'deflections'],
    ],
  });

  // Update selectedHold with fresh data from holds list when it changes (to get transferToken after QR generation)
  useEffect(() => {
    if (selectedHold?.id && deflections) {
      const freshHold = deflections.find(h => h.id === selectedHold.id);
      if (freshHold) {
        // Only update if transferToken changed (was added or updated)
        const hadToken = !!selectedHold.transferToken;
        const hasToken = !!freshHold.transferToken;
        if (hasToken !== hadToken || (hasToken && freshHold.transferToken !== selectedHold.transferToken)) {
          console.log('[Transfer Feedback] Updating selectedHold with fresh data, has transferToken:', hasToken);
          setSelectedHold(freshHold);
        }
      }
    }
  }, [deflections, selectedHold]);

  // Only one transfer operation at a time - poll only for selectedHold when modal is open
  const transferHoldIdToPoll = (qrModalOpened && selectedHold?.id) ? selectedHold.id : null;

  // Check if transfer token has expired for the selected hold
  const isTransferTokenExpired = useMemo(() => {
    if (!selectedHold?.transferTokenExpiresAt) return false;
    return new Date(selectedHold.transferTokenExpiresAt) < new Date();
  }, [selectedHold]);

  // Poll transfer status - only when modal is open with a selected hold
  // Since there's only one transfer operation at a time, we only poll for selectedHold
  const shouldPoll = !!transferHoldIdToPoll && !isTransferTokenExpired && qrModalOpened;

  // Debug logging for polling setup
  useEffect(() => {
    console.log('[Transfer Feedback] Polling setup:', {
      transferHoldIdToPoll,
      qrModalOpened,
      selectedHoldId: selectedHold?.id,
      isTransferTokenExpired,
      enabled: shouldPoll,
    });
  }, [transferHoldIdToPoll, qrModalOpened, selectedHold?.id, isTransferTokenExpired, shouldPoll]);

  const { data: transferStatus } = useQuery({
    queryKey: ['hold-transfer-status', transferHoldIdToPoll],
    queryFn: async () => {
      console.log('[Transfer Feedback] Polling transfer status for hold:', transferHoldIdToPoll);
      const response = await Api.holds.get(transferHoldIdToPoll);
      console.log('[Transfer Feedback] Transfer status response:', response.data);
      return response.data;
    },
    enabled: shouldPoll,
    refetchInterval: (query) => {
      // Early return if polling shouldn't be happening (query is disabled)
      if (!shouldPoll || !transferHoldIdToPoll || !qrModalOpened) {
        return false;
      }

      // Stop polling if expired
      if (isTransferTokenExpired) {
        console.log('[Transfer Feedback] Token expired, stopping polling');
        return false;
      }
      // Stop polling if transferred
      if (query.state.data?.isTransferred) {
        console.log('[Transfer Feedback] Hold transferred, stopping polling');
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });

  // Track previous transfer status to detect changes
  const prevTransferStatusRef = useRef(null);

  // Show feedback when transfer completes
  useEffect(() => {
    // Handle initial case where prevTransferStatusRef is null (first poll)
    // Also handle case where status changes from false to true
    const wasNotTransferred = prevTransferStatusRef.current === null || !prevTransferStatusRef.current?.transferredAt;
    const isNowTransferred = !!transferStatus?.transferredAt;

    // Only show notification when status changes from not-transferred to transferred
    if (wasNotTransferred && isNowTransferred && transferHoldIdToPoll) {
      console.log('[Transfer Feedback] Transfer completed, showing notification');
      // Get client name from the hold if available, otherwise use hold ID
      const holdId = transferHoldIdToPoll;
      const clientName = selectedHold?.client
        ? `${selectedHold.client.firstName} ${selectedHold.client.lastName || ''}`.trim()
        : null;
      const displayName = clientName || holdId.substring(0, 8).toUpperCase();

      showToast(`Client checked in: ${displayName}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'holds'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'availability'] });
      // Close QR modal (only one transfer at a time, so this must be the one)
      if (qrModalOpened) {
        console.log('[Transfer Feedback] Closing QR modal for transferred hold');
        closeQRModal();
        setSelectedHold(null);
      }
    }

    // Update ref
    prevTransferStatusRef.current = transferStatus;
  }, [transferStatus?.transferredAt, transferHoldIdToPoll, selectedHold, showToast, queryClient, facility.id, qrModalOpened, closeQRModal]);

  // Handle token expiration - close modal and stop polling
  // Only check expiration for the selected hold when modal is open
  useEffect(() => {
    if (qrModalOpened && selectedHold) {
      // Check expiration specifically for the selected hold in the modal
      const selectedHoldExpired = selectedHold.transferTokenExpiresAt &&
        new Date(selectedHold.transferTokenExpiresAt) < new Date();

      if (selectedHoldExpired) {
        console.log('[Transfer Feedback] Token expired for selected hold, closing modal');
        showToast('Transfer token expired. Please generate a new QR code.', 'warning');
        closeQRModal();
        setSelectedHold(null);
        queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'holds'] });
      }
    }
  }, [qrModalOpened, selectedHold, closeQRModal, showToast, queryClient, facility.id]);

  const extendAllMutation = useMutation({
    mutationFn: (holdIds) => Api.holds.extend(holdIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'holds'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'availability'] });
      showToast('All holds extended by 30 minutes', 'success');
    },
    onError: (error) => {
      const errorMessage = error.message || 'Failed to extend all holds';
      showToast(errorMessage, 'error');
    },
  });

  function onHoldClick () {
    if (!incident) {
      let bedTypeId;
      if (bedTypes?.length === 1) {
        bedTypeId = bedTypes[0].id;
      }
      navigate(`/incident${bedTypeId ? `?bedTypeId=${bedTypeId}` : ''}`);
    }
  }

  const handleExtendAll = () => {
    if (deflections.length === 0) return;
    extendAllMutation.mutate(deflections.map(h => h.id));
  };

  // Early returns MUST come after all hooks
  if (isLoading) {
    return (
      <Container>
        <Loader />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert icon={<IconAlertCircle />} title='Error' color='red'>
          Failed to load holds.
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Holds</title>
      </Head>
      <Container>
        <CancelHoldModal
          opened={cancelModalOpened}
          onClose={() => {
            closeCancelModal();
          }}
          onConfirm={handleConfirmCancel}
          holdIdentifier={selectedHold?.id ? selectedHold.id.slice(0, 8).toUpperCase() : '001'}
          holdName={
            selectedHold?.client
              ? `${selectedHold.client.firstName} ${selectedHold.client.lastName || ''}`.trim()
              : selectedHold?.notes || selectedHold?.facilityName || 'this hold'
          }
          loading={cancelMutation.isPending}
        />

        <HoldQRCode
          holdId={selectedHold?.id}
          opened={qrModalOpened}
          onClose={() => {
            const holdIdToCancel = selectedHold?.id;
            if (holdIdToCancel) {
              console.log('[Transfer Feedback] QR modal closed, stopping polling for:', holdIdToCancel);
              // Cancel any ongoing polling queries for this hold
              queryClient.cancelQueries({ queryKey: ['hold-transfer-status', holdIdToCancel] });
            }
            handleCloseQRModal();
          }}
          onDone={handleQRDone}
        />

        <Stack gap='xl'>
          <Facility
            facility={facility}
            bedTypes={bedTypes}
            onHoldClick={() => onHoldClick()}
          />
          <SegmentedControl
            fullWidth
            value='holds'
            onChange={(value) => navigate('/history')}
            data={[
              { label: 'Active holds', value: 'holds' },
              { label: 'History', value: 'history' },
            ]}
          />
          {incident && (
            <Incident incident={incident} editLink='/incident' />
          )}
          {(!deflections || deflections.length === 0) && (
            <>
              <Box bdrs='50%' bg='gray.1' w='160px' h='160px' mx='auto' />
              <Box align='center'>
                <Title order={4}>You don't have any active holds</Title>
                <Text size='md' c='dimmed'>New holds will show up here once you start them.</Text>
              </Box>
            </>
          )}
          {deflections && deflections.length > 0 && (
            <>
              <Stack gap='md'>
                {deflections?.map((deflection) => (
                  <Hold
                    key={deflection.id}
                    deflection={deflection}
                    onDetailsClick={() => {
                      navigate(`/intake/${deflection.id}`);
                    }}
                  />
                ))}
              </Stack>
              <Button
                variant='secondary'
                onClick={handleExtendAll}
                disabled={extendAllMutation.isPending}
                fullWidth
              >
                Extend all holds
              </Button>
            </>
          )}
          <Text size='xs' c='gray.5' align='center'>
            Last updated: {facility?.updatedAt ? DateTime.fromISO(facility.updatedAt).toLocaleString(DateTime.TIME_SIMPLE) : ''}
          </Text>
        </Stack>
      </Container>
    </>
  );
}

export default Holds;
