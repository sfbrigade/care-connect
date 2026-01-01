import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Title, Stack, Loader, Alert, /* Modal, */ Text } from '@mantine/core';
import { useNavigate, /* useSearchParams */ } from 'react-router';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';

import Api from '@/Api';
// import HoldForm from './HoldForm';
import CancelHoldModal from './CancelHoldModal';
import HoldQRCode from './HoldQRCode';
import LESCFacility from './LESCFacility';
import LESCHold from './LESCHold';
import Chip from '@/components/Chip';
import { useToast } from '@/components/ToastContext';
import { formatTime, calculateAge } from '@/utils/dateTime';
import { useAuthContext } from '@/AuthContext';
import { useHoldActions } from '@/lesc/hooks/useHoldActions';

import { useFacilityContext } from '@/FacilityContext';

function Holds () {
  const navigate = useNavigate();
  const { facility } = useFacilityContext();
  // const [searchParams] = useSearchParams();
  // Modal hooks kept for future use - currently disabled in favor of direct hold creation
  // const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuthContext();

  // Use shared hold actions hook
  const {
    cancelModalOpened,
    qrModalOpened,
    selectedHold,
    setSelectedHold,
    handleCancel,
    handleConfirmCancel,
    handleTransfer,
    handleExtend,
    handleCloseQRModal,
    handleQRDone,
    cancelMutation,
    closeCancelModal,
    closeQRModal,
  } = useHoldActions({
    invalidateQueries: ['lesc-holds', facility.id],
  });

  // Check both query param and location.state for create modal flag
  // const shouldOpenCreateModal = searchParams.get('create') === 'true' || location.state?.openCreateModal;

  // Auto-open modal only if explicitly requested (e.g., via "Hold a Bed" button)
  // useEffect(() => {
  //   if (shouldOpenCreateModal) {
  //     openCreateModal();
  //   }
  // }, [shouldOpenCreateModal, openCreateModal]);

  const { data: holds, isLoading, error } = useQuery({
    queryKey: ['lesc-holds', facility.id],
    queryFn: async () => {
      const response = await Api.lesc.holds.list(facility.id);
      return response.data;
    },
  });

  const { data: availabilityData } = useQuery({
    queryKey: ['lesc-availability'],
    queryFn: async () => {
      const response = await Api.lesc.availability();
      return response.data;
    },
  });

  // Update selectedHold with fresh data from holds list when it changes (to get transferToken after QR generation)
  useEffect(() => {
    if (selectedHold?.id && holds) {
      const freshHold = holds.find(h => h.id === selectedHold.id);
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
  }, [holds, selectedHold]);

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
      const response = await Api.lesc.holds.transferStatus(transferHoldIdToPoll);
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
    const wasNotTransferred = prevTransferStatusRef.current === null || prevTransferStatusRef.current?.isTransferred === false;
    const isNowTransferred = transferStatus?.isTransferred === true;

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
      queryClient.invalidateQueries({ queryKey: ['lesc-holds', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      // Close QR modal (only one transfer at a time, so this must be the one)
      if (qrModalOpened) {
        console.log('[Transfer Feedback] Closing QR modal for transferred hold');
        closeQRModal();
        setSelectedHold(null);
      }
    }

    // Update ref
    prevTransferStatusRef.current = transferStatus;
  }, [transferStatus?.isTransferred, transferHoldIdToPoll, selectedHold, showToast, queryClient, facility.id, qrModalOpened, closeQRModal]);

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
        queryClient.invalidateQueries({ queryKey: ['lesc-holds', facility.id] });
      }
    }
  }, [qrModalOpened, selectedHold, closeQRModal, showToast, queryClient, facility.id]);

  // Get facility info for specific facility view
  const facilityInfo = useMemo(() => {
    if (!facility || !availabilityData) return null;

    // Calculate total available beds for this facility
    const facilityAvailability = availabilityData.filter(item => item.facilityId === facility.id);
    const totalAvailable = facilityAvailability.reduce((sum, item) => {
      return sum + (item.calculatedAvailable ?? item.availableBeds ?? 0);
    }, 0);

    // Format address
    const addressParts = [];
    if (facility.addressLine1) addressParts.push(facility.addressLine1);
    if (facility.city) addressParts.push(facility.city);
    if (facility.state) addressParts.push(facility.state);
    const address = addressParts.length > 0 ? addressParts.join(', ') : facility.neighborhood || 'Address not available';

    return {
      ...facility,
      address,
      bedCount: totalAvailable,
    };
  }, [facility, availabilityData]);

  // Get the single LESC facility info for the LESCCard
  const lescFacilityInfo = useMemo(() => {
    if (!facility || !availabilityData) return null;

    // Calculate total available beds
    const facilityAvailability = availabilityData.filter(item => item.facilityId === facility.id);
    const totalAvailable = facilityAvailability.reduce((sum, item) => {
      return sum + (item.calculatedAvailable ?? item.availableBeds ?? 0);
    }, 0);

    // Format address
    const addressParts = [];
    if (facility.addressLine1) addressParts.push(facility.addressLine1);
    if (facility.city) addressParts.push(facility.city);
    if (facility.state) addressParts.push(facility.state);
    const address = addressParts.length > 0 ? addressParts.join(', ') : facility.neighborhood || 'Address not available';

    return {
      name: facility.name,
      address,
      bedCount: totalAvailable,
      updatedAt: facility.updatedAt,
    };
  }, [facility, availabilityData]);

  const extendAllMutation = useMutation({
    mutationFn: async (holdIds) => {
      const results = await Promise.allSettled(
        holdIds.map(id => Api.lesc.holds.extend(id))
      );
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`Failed to extend ${failures.length} hold(s)`);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesc-holds', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      showToast('All holds extended by 30 minutes', 'success');
    },
    onError: (error) => {
      const errorMessage = error.message || 'Failed to extend all holds';
      showToast(errorMessage, 'error');
    },
  });

  // Get the service type with most availability for a facility (same logic as HoldForm)
  const getServiceTypeForFacility = (facId) => {
    if (!availabilityData || !facId) return null;
    const facilityServices = availabilityData.filter(item => item.facilityId === facId);
    if (facilityServices.length === 0) return null;
    // Return the service type with the most available beds
    return facilityServices.reduce((best, current) =>
      current.calculatedAvailable > best.calculatedAvailable ? current : best
    );
  };

  // Create hold directly (1 bed, no notes) - replaces modal flow
  const createHoldDirectlyMutation = useMutation({
    mutationFn: async (targetFacilityId) => {
      const serviceInfo = getServiceTypeForFacility(targetFacilityId);
      if (!serviceInfo) {
        throw new Error('No service type available for this facility');
      }
      return Api.lesc.holds.create({
        facilityId: targetFacilityId,
        serviceTypeId: serviceInfo.serviceTypeId,
        bedsRequested: 1,
        notes: undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesc-holds', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      showToast('Bed hold created successfully', 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'Failed to create hold';
      showToast(errorMessage, 'error');
    },
  });

  const handleCreateHoldDirectly = (targetFacilityId) => {
    if (!targetFacilityId) {
      // If no facility ID provided, use the LESC facility
      if (facility) {
        createHoldDirectlyMutation.mutate(facility.id);
      } else {
        showToast('Facility information not available', 'error');
      }
    } else {
      createHoldDirectlyMutation.mutate(targetFacilityId);
    }
  };

  const handleExtendAll = () => {
    if (userHolds.length === 0) return;
    extendAllMutation.mutate(userHolds.map(h => h.id));
  };

  // Filter holds to only show current user's holds
  const userHolds = useMemo(() => {
    if (!holds || !user) return [];
    return holds.filter(hold => hold.createdBy?.id === user.id);
  }, [holds, user]);

  // Group ALL holds by creator and count them (for banner display)
  const holdsByUser = useMemo(() => {
    if (!holds) return {};
    const grouped = {};
    holds.forEach(hold => {
      if (hold.createdBy) {
        const userName = `${hold.createdBy.firstName} ${hold.createdBy.lastName}`.trim();
        grouped[userName] = (grouped[userName] || 0) + 1;
      }
    });
    return grouped;
  }, [holds]);

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
    <Container size='sm' py='md' px='md' style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <Title order={2} mb='md'>Active Bed Holds</Title>

      {/* Active holds breakdown by user */}
      {Object.keys(holdsByUser).length > 0 && (
        <Alert icon={<IconInfoCircle size={16} />} color='blue' mb='md'>
          <Text size='sm' fw={500} mb={4}>
            Active holds
          </Text>
          <Stack gap={2}>
            {Object.entries(holdsByUser)
              .sort(([, a], [, b]) => b - a) // Sort by count descending
              .map(([userName, count]) => (
                <Text key={userName} size='sm'>
                  {userName}: <strong>{count}</strong>
                </Text>
              ))}
          </Stack>
        </Alert>
      )}

      {/* Extend All button */}
      {userHolds && userHolds.length > 0 && (
        <div style={{ width: '100%', marginBottom: '16px' }}>
          <Chip
            onClick={handleExtendAll}
            disabled={extendAllMutation.isPending}
            style={{
              width: '100%',
              display: 'block',
              justifyContent: 'center',
              backgroundColor: '#868E961A',
            }}
          >
            Extend All Holds by 30 Minutes
          </Chip>
        </div>
      )}

      {/* Modal code kept for future use - currently disabled in favor of direct hold creation */}
      {/* <Modal
        opened={createModalOpened}
        onClose={closeCreateModal}
        title='Create Bed Hold'
        size='auto'
        centered
        lockScroll
        styles={{
          content: {
            borderRadius: '16px',
            maxHeight: '90vh',
            maxWidth: '100vw',
            marginTop: '80px',
          },
          body: {
            maxHeight: 'calc(90vh - 120px)',
            overflowY: 'auto',
            padding: '20px',
          },
        }}
      >
        <HoldForm
          onSuccess={() => {
            closeCreateModal();
            queryClient.invalidateQueries({ queryKey: ['lesc-holds', facilityId] });
            queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
          }}
          initialFacilityId={facilityId}
        />
      </Modal> */}

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

      {userHolds && userHolds.length === 0
        ? (
          <Stack gap='md'>
            {lescFacilityInfo && (
              <LESCFacility
                facilityName={lescFacilityInfo.name}
                address={lescFacilityInfo.address}
                bedCount={lescFacilityInfo.bedCount}
                intakeHours='24/7'
                lastUpdated={lescFacilityInfo.updatedAt ? formatTime(new Date(lescFacilityInfo.updatedAt)) : undefined}
                onHoldClick={() => handleCreateHoldDirectly(facility?.id)}
              />
            )}
            <Alert>No active holds.</Alert>
          </Stack>
          )
        : facility.id
          ? (
            // Single facility view - show facility card then holds
            <Stack gap='xl'>
              {facilityInfo && (
                <LESCFacility
                  facilityName={facilityInfo.name}
                  address={facilityInfo.address}
                  bedCount={facilityInfo.bedCount}
                  intakeHours='24/7'
                  lastUpdated={facilityInfo.updatedAt ? formatTime(new Date(facilityInfo.updatedAt)) : undefined}
                  onCallClick={() => {
                    // TODO: Implement call functionality
                    console.log('Call facility:', facilityInfo.name);
                  }}
                  onHoldClick={() => handleCreateHoldDirectly(facilityInfo.id)}
                />
              )}
              <Stack gap='md'>
                {userHolds?.map((hold) => {
                  // Calculate age from dateOfBirth if available
                  const age = calculateAge(hold.client?.dateOfBirth);

                  return (
                    <LESCHold
                      key={hold.id}
                      hold={hold}
                      patientId={hold.client?.id ? hold.client.id.slice(0, 3).toUpperCase() : undefined}
                      patientName={hold.client ? `${hold.client.firstName} ${hold.client.lastName || ''}`.trim() : undefined}
                      patientDob={hold.client?.dateOfBirth}
                      patientAge={age}
                      patientSex={hold.client?.sex}
                      patientRace={hold.client?.race}
                      onTransfer={handleTransfer}
                      onExtend={handleExtend}
                      onCancel={handleCancel}
                      onViewDetails={() => {
                        navigate(`/intake/${hold.id}`);
                      }}
                    />
                  );
                })}
              </Stack>
            </Stack>
            )
          : (
            // All holds view - show LESCFacility then holds
            <Stack gap='xl'>
              {lescFacilityInfo && (
                <LESCFacility
                  facilityName={lescFacilityInfo.name}
                  address={lescFacilityInfo.address}
                  bedCount={lescFacilityInfo.bedCount}
                  intakeHours='24/7'
                  lastUpdated={lescFacilityInfo.updatedAt ? formatTime(new Date(lescFacilityInfo.updatedAt)) : undefined}
                  onHoldClick={() => handleCreateHoldDirectly(facility?.id)}
                />
              )}
              <Stack gap='md'>
                {userHolds?.map((hold) => {
                  // Calculate age from dateOfBirth if available
                  const age = calculateAge(hold.client?.dateOfBirth);

                  return (
                    <LESCHold
                      key={hold.id}
                      hold={hold}
                      patientId={hold.client?.id ? hold.client.id.slice(0, 3).toUpperCase() : undefined}
                      patientName={hold.client ? `${hold.client.firstName} ${hold.client.lastName || ''}`.trim() : undefined}
                      patientDob={hold.client?.dateOfBirth}
                      patientAge={age}
                      patientSex={hold.client?.sex}
                      patientRace={hold.client?.race}
                      onTransfer={handleTransfer}
                      onExtend={handleExtend}
                      onCancel={handleCancel}
                      onViewDetails={() => {
                        navigate(`/intake/${hold.id}`);
                      }}
                    />
                  );
                })}
              </Stack>
            </Stack>
            )}
    </Container>
  );
}

export default Holds;
