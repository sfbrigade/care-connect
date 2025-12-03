import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Title, Button, Stack, Group, Loader, Alert, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { IconAlertCircle, IconPlus, IconClock, IconX, IconQrcode } from '@tabler/icons-react';

import Api from '../../../core/Api';
import HoldForm from './HoldForm';
import CancelHoldModal from './CancelHoldModal';
import HoldQRCode from './HoldQRCode';
import LESCFacility from './LESCFacility';
import Card from '../../../core/components/Card';
import Chip from '../../../core/components/Chip';
import { useToast } from '../../../core/components/ToastContext';
import { formatCreatedAt, formatTime } from '../../../core/utils/dateTime';

function Holds () {
  const location = useLocation();
  const navigate = useNavigate();
  const { facilityId: facilityIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [cancelModalOpened, { open: openCancelModal, close: closeCancelModal }] = useDisclosure(false);
  const [qrModalOpened, { open: openQRModal, close: closeQRModal }] = useDisclosure(false);
  const [selectedHold, setSelectedHold] = useState(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Prioritize URL param over location.state for facilityId
  const facilityId = facilityIdParam || location.state?.facilityId;
  // Check both query param and location.state for create modal flag
  const shouldOpenCreateModal = searchParams.get('create') === 'true' || location.state?.openCreateModal;

  // Auto-open modal only if explicitly requested (e.g., via "Hold a Bed" button)
  useEffect(() => {
    if (shouldOpenCreateModal) {
      openCreateModal();
    }
  }, [shouldOpenCreateModal, openCreateModal]);

  const { data: holds, isLoading, error } = useQuery({
    queryKey: ['lesc-holds', facilityId],
    queryFn: async () => {
      const response = await Api.lesc.holds.list(facilityId);
      return response.data;
    },
  });

  // Fetch facilities and availability data
  const { data: facilitiesData } = useQuery({
    queryKey: ['lesc-facilities'],
    queryFn: async () => {
      const response = await Api.facilities.list();
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

  // Get facility info for specific facility view
  const facilityInfo = useMemo(() => {
    if (!facilityId || !facilitiesData || !availabilityData) return null;

    const facility = facilitiesData.find(f => f.id === facilityId);
    if (!facility) return null;

    // Calculate total available beds for this facility
    const facilityAvailability = availabilityData.filter(item => item.facilityId === facilityId);
    const totalAvailable = facilityAvailability.reduce((sum, item) => {
      return sum + (item.calculatedAvailable ?? item.availableBeds ?? 0);
    }, 0);

    // Format address
    const addressParts = [];
    if (facility.address?.line1) addressParts.push(facility.address.line1);
    if (facility.address?.city) addressParts.push(facility.address.city);
    if (facility.address?.state) addressParts.push(facility.address.state);
    const address = addressParts.length > 0 ? addressParts.join(', ') : facility.neighborhood || 'Address not available';

    return {
      ...facility,
      address,
      bedCount: totalAvailable,
    };
  }, [facilityId, facilitiesData, availabilityData]);

  // Group holds by facility for the all holds view
  const holdsByFacility = useMemo(() => {
    if (!holds || facilityId) return null;

    const grouped = new Map();
    holds.forEach((hold) => {
      if (!grouped.has(hold.facilityId)) {
        grouped.set(hold.facilityId, {
          facilityId: hold.facilityId,
          facilityName: hold.facilityName,
          holds: [],
        });
      }
      grouped.get(hold.facilityId).holds.push(hold);
    });

    return Array.from(grouped.values());
  }, [holds, facilityId]);

  // Get facility info for each facility in the grouped holds
  const facilitiesWithHolds = useMemo(() => {
    if (!holdsByFacility || !facilitiesData || !availabilityData) return [];

    return holdsByFacility.map((group) => {
      const facility = facilitiesData.find(f => f.id === group.facilityId);
      if (!facility) return null;

      // Calculate total available beds for this facility
      const facilityAvailability = availabilityData.filter(item => item.facilityId === group.facilityId);
      const totalAvailable = facilityAvailability.reduce((sum, item) => {
        return sum + (item.calculatedAvailable ?? item.availableBeds ?? 0);
      }, 0);

      // Format address
      const addressParts = [];
      if (facility.address?.line1) addressParts.push(facility.address.line1);
      if (facility.address?.city) addressParts.push(facility.address.city);
      if (facility.address?.state) addressParts.push(facility.address.state);
      const address = addressParts.length > 0 ? addressParts.join(', ') : facility.neighborhood || 'Address not available';

      return {
        ...facility,
        address,
        bedCount: totalAvailable,
        holds: group.holds,
      };
    }).filter(Boolean);
  }, [holdsByFacility, facilitiesData, availabilityData]);

  const extendMutation = useMutation({
    mutationFn: (id) => Api.lesc.holds.extend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesc-holds', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => Api.lesc.holds.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesc-holds', facilityId] });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
    },
  });

  const handleExtend = (id) => {
    extendMutation.mutate(id);
  };

  const handleCancel = (hold) => {
    setSelectedHold(hold);
    openCancelModal();
  };

  const handleShowQR = (hold) => {
    setSelectedHold(hold);
    openQRModal();
  };

  const handleConfirmCancel = () => {
    if (selectedHold) {
      const holdName = selectedHold.notes || selectedHold.facilityName || 'this hold';
      cancelMutation.mutate(selectedHold.id, {
        onSuccess: () => {
          closeCancelModal();
          setSelectedHold(null);
          showToast(`Hold canceled for ${holdName}`, 'success');
        },
      });
    }
  };

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
    <Container size='sm' py='md' px='md'>
      <Group justify='space-between' mb='md'>
        <Title order={2}>Active Bed Holds</Title>
        <Button leftSection={<IconPlus />} onClick={openCreateModal}>
          Create Hold
        </Button>
      </Group>

      {/* Filter chips */}
      <Group gap='sm' mb='md'>
        <Chip active>Current holds</Chip>
        <Chip active={false}>This week</Chip>
        <Chip active={false}>History</Chip>
      </Group>

      <Modal
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
      </Modal>

      <CancelHoldModal
        opened={cancelModalOpened}
        onClose={() => {
          closeCancelModal();
          setSelectedHold(null);
        }}
        onConfirm={handleConfirmCancel}
        holdIdentifier={selectedHold?.id?.slice(0, 8).toUpperCase() || '001'}
        holdName={selectedHold?.notes || selectedHold?.facilityName || 'this hold'}
        loading={cancelMutation.isPending}
      />

      <HoldQRCode
        holdId={selectedHold?.id}
        opened={qrModalOpened}
        onClose={() => {
          closeQRModal();
          setSelectedHold(null);
        }}
      />

      {holds && holds.length === 0
        ? (
          <Alert>No active holds.</Alert>
          )
        : facilityId
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
                  onHoldClick={() => navigate(`/lesc/holds/${facilityInfo.id}?create=true`)}
                />
              )}
              <Stack gap='md'>
                {holds?.map((hold) => {
                const expiresAt = new Date(hold.expiresAt);
                const isExpiringSoon = expiresAt.getTime() - Date.now() < 15 * 60 * 1000;

                return (
                  <Card
                    key={hold.id}
                    title={hold.facilityName}
                    subtitle={formatCreatedAt(hold.createdAt)}
                    badgeStatus={isExpiringSoon ? 'warning' : 'active'}
                    actions={
                      <>
                        <Button
                          leftSection={<IconQrcode size={18} />}
                          variant='light'
                          size='sm'
                          onClick={() => handleShowQR(hold)}
                        >
                          QR Code
                        </Button>
                        <Button
                          leftSection={<IconClock size={18} />}
                          variant='light'
                          size='sm'
                          onClick={() => handleExtend(hold.id)}
                          loading={extendMutation.isPending}
                        >
                          Extend 30 min
                        </Button>
                        <Button
                          leftSection={<IconX size={18} />}
                          variant='light'
                          color='red'
                          size='sm'
                          onClick={() => handleCancel(hold)}
                          loading={cancelMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </>
                  }
                  />
                );
              })}
              </Stack>
            </Stack>
            )
          : (
            // All holds view - group by facility with facility cards
            <Stack gap='xl'>
              {facilitiesWithHolds.map((facility) => (
                <Stack key={facility.id} gap='md'>
                  <LESCFacility
                    facilityName={facility.name}
                    address={facility.address}
                    bedCount={facility.bedCount}
                    intakeHours='24/7'
                    lastUpdated={facility.updatedAt ? formatTime(new Date(facility.updatedAt)) : undefined}
                    onCallClick={() => {
                      // TODO: Implement call functionality
                      console.log('Call facility:', facility.name);
                    }}
                    onHoldClick={() => navigate(`/lesc/holds/${facility.id}?create=true`)}
                  />
                  <Stack gap='md'>
                    {facility.holds.map((hold) => {
                      const expiresAt = new Date(hold.expiresAt);
                      const isExpiringSoon = expiresAt.getTime() - Date.now() < 15 * 60 * 1000;

                      return (
                        <Card
                          key={hold.id}
                          title={hold.facilityName}
                          subtitle={formatCreatedAt(hold.createdAt)}
                          badgeStatus={isExpiringSoon ? 'warning' : 'active'}
                          actions={
                            <>
                              <Button
                                leftSection={<IconQrcode size={18} />}
                                variant='light'
                                size='sm'
                                onClick={() => handleShowQR(hold)}
                              >
                                QR Code
                              </Button>
                              <Button
                                leftSection={<IconClock size={18} />}
                                variant='light'
                                size='sm'
                                onClick={() => handleExtend(hold.id)}
                                loading={extendMutation.isPending}
                              >
                                Extend 30 min
                              </Button>
                              <Button
                                leftSection={<IconX size={18} />}
                                variant='light'
                                color='red'
                                size='sm'
                                onClick={() => handleCancel(hold)}
                                loading={cancelMutation.isPending}
                              >
                                Cancel
                              </Button>
                            </>
                          }
                        />
                      );
                    })}
                  </Stack>
                </Stack>
              ))}
            </Stack>
            )}
    </Container>
  );
}

export default Holds;
