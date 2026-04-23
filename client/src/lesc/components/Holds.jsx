import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ActionIcon, Box, Button, Container, Menu, SegmentedControl, Stack, Text } from '@mantine/core';
import { useNavigate } from 'react-router';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';
import { IconAlarmPlus, IconDots, IconScan } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import { useAuthContext } from '@/AuthContext';
import ActionFooter from '@/components/ActionFooter';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import { facilityLiveQueryOptions } from '@/hooks/facilityLiveQueryOptions';
import useSessionState from '@/hooks/useSessionState';
import { formatTime } from '@/utils/format';

import FacilityStatusBanner from '@/components/FacilityStatusBanner';
import CancelHoldModal from './CancelHoldModal';
import ArrivalConfirmationModal from './ArrivalConfirmationModal';
import ScanHandoffCodeModal from './ScanHandoffCodeModal';
import Facility from './Facility';
import HoldsActive from './HoldsActive';
import HoldsHistory from './HoldsHistory';
import {
  SFPD_HISTORY_ACTIVE_SUBJECT_STATUSES,
  buildAdminCancelledHoldsMessage,
  buildHistoryDisplayDeflections,
  detectAutoCancelledExpiredHolds,
  mergeHistoryDeflections,
} from './holdsViewModel';

function parseAutoCancelledNoticeState (value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function Holds () {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [holdsHighlighted, setHoldsHighlighted] = useState(false);
  const [scanHandoffModalOpened, setScanHandoffModalOpened] = useState(false);

  const { data: freshFacility } = useQuery({
    queryKey: ['facilities', facility.id],
    queryFn: () => Api.facilities.get(facility.id).then(response => response.data),
    ...facilityLiveQueryOptions,
  });

  const { data: bedTypes } = useQuery({
    queryKey: ['facilities', facility.id, 'bed-types'],
    queryFn: () => Api.facilities.bedTypes.index(facility.id).then(response => response.data),
    ...facilityLiveQueryOptions,
  });

  const { data: myHolds, dataUpdatedAt: myHoldsUpdatedAt } = useQuery({
    queryKey: ['facilities', facility.id, 'my-holds'],
    queryFn: () => Api.facilities.myHolds(facility.id).then(response => response.data),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    refetchInterval: 3000,
  });

  // Flatten all deflections from all incidents for convenience
  const allActiveDeflections = (myHolds?.incidents ?? []).flatMap(inc => inc.deflections);

  const {
    data: inactiveDeflections,
    isFetching: isFetchingInactiveDeflections,
  } = useQuery({
    queryKey: ['deflections', facility?.id, 'inactive'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, active: false }).then(response => response.data),
    enabled: !!facility,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const {
    data: postTransferActiveDeflections,
    isFetching: isFetchingPostTransferActiveDeflections,
  } = useQuery({
    queryKey: ['deflections', facility?.id, 'post-transfer-active'],
    queryFn: () => Api.deflections.list({
      facilityId: facility.id,
      active: true,
      subjectStatus: SFPD_HISTORY_ACTIVE_SUBJECT_STATUSES,
    }).then(response => response.data),
    enabled: !!facility,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const {
    data: handedOffDeflections,
  } = useQuery({
    queryKey: ['deflections', facility?.id, 'handed-off'],
    queryFn: () => Api.deflections.list({ facilityId: facility.id, handedOff: true }).then(response => response.data),
    enabled: !!facility,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const historyDeflections = mergeHistoryDeflections(inactiveDeflections ?? [], postTransferActiveDeflections ?? [], handedOffDeflections ?? []);
  const displayHistoryDeflections = buildHistoryDisplayDeflections(historyDeflections, null, allActiveDeflections.length > 0);

  const [tab, setTab] = useSessionState('holds', 'active');
  const [autoCancelledNoticeState, setAutoCancelledNoticeState] = useSessionState('holds-auto-cancelled-notice', '');
  const autoCancelledNotice = parseAutoCancelledNoticeState(autoCancelledNoticeState);
  const [adminCancelledNoticeState, setAdminCancelledNoticeState] = useSessionState('holds-admin-cancelled-notice', '');
  const adminCancelledNotice = parseAutoCancelledNoticeState(adminCancelledNoticeState);
  const previousActiveDeflectionIdsRef = useRef([]);
  const pendingAutoCancelledCheckRef = useRef(null);

  const lastSyncedAtMs = myHoldsUpdatedAt ?? 0;

  useEffect(() => {
    const currentDeflectionIds = allActiveDeflections.map((deflection) => deflection.id);
    const removedDeflectionIds = previousActiveDeflectionIdsRef.current
      .filter((id) => !currentDeflectionIds.includes(id));

    if (removedDeflectionIds.length > 0) {
      pendingAutoCancelledCheckRef.current = {
        deflectionIds: removedDeflectionIds,
      };
    }

    const pendingCheck = pendingAutoCancelledCheckRef.current;
    const detectedNotice = detectAutoCancelledExpiredHolds({
      previousDeflectionIds: pendingCheck?.deflectionIds ?? [],
      currentDeflections: allActiveDeflections,
      historyDeflections,
    });

    if (detectedNotice) {
      setAutoCancelledNoticeState(JSON.stringify(detectedNotice));
      pendingAutoCancelledCheckRef.current = null;
    } else if (pendingCheck) {
      const matchedHistoryDeflectionCount = historyDeflections
        .filter((deflection) => pendingCheck.deflectionIds.includes(deflection.id))
        .length;

      if (matchedHistoryDeflectionCount === pendingCheck.deflectionIds.length) {
        pendingAutoCancelledCheckRef.current = null;
      }
    }

    // Check for admin-cancelled holds by fetching removed deflections directly
    if (removedDeflectionIds.length > 0 && !detectedNotice) {
      (async () => {
        try {
          const [removed, freshFacility] = await Promise.all([
            Promise.all(removedDeflectionIds.map(id => Api.deflections.get(id).then(r => r.data))),
            Api.facilities.get(facility.id).then(r => r.data),
          ]);
          const adminCancelled = removed.filter(d =>
            d.status === 'CANCELLED' &&
            d.cancelledById &&
            d.cancelledById !== user?.id
          );
          if (adminCancelled.length > 0) {
            const allCancelled = freshFacility.status === 'CLOSED';
            const firstCancelled = adminCancelled[0];
            const personName = [
              firstCancelled.subject?.firstName,
              firstCancelled.subject?.lastName,
            ].filter(Boolean).join(' ') || null;
            const message = buildAdminCancelledHoldsMessage({
              count: adminCancelled.length,
              allCancelled,
              personName,
              facilityName: facility?.name || 'Facility',
            });
            setAdminCancelledNoticeState(JSON.stringify({
              count: adminCancelled.length,
              allCancelled,
              message,
            }));
          }
        } catch {
          // Silently ignore fetch errors for notification detection
        }
      })();
    }

    previousActiveDeflectionIdsRef.current = currentDeflectionIds;
  }, [
    autoCancelledNotice,
    allActiveDeflections.length,
    historyDeflections,
    setAutoCancelledNoticeState,
    setAdminCancelledNoticeState,
    adminCancelledNotice,
    user?.id,
    facility?.name,
  ]);

  function onDismissAutoCancelledNotice () {
    setAutoCancelledNoticeState('');
  }

  function onDismissAdminCancelledNotice () {
    setAdminCancelledNoticeState('');
  }

  const markArrivedMutation = useMutation({
    mutationFn: () => Api.facilities.arrived(facility.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'my-holds'] });
    },
  });

  function onArrivedClick () {
    setShowArrivalConfirmationModal(true);
  }

  function onConfirmArrival () {
    setShowArrivalConfirmationModal(false);
    markArrivedMutation.mutate();
  }

  function onCloseArrivalConfirmationModal () {
    setShowArrivalConfirmationModal(false);
  }

  const markLeftMutation = useMutation({
    mutationFn: () => Api.facilities.left(facility.id),
    onSuccess: () => {
      const facilityName = facility?.name ?? 'RESET';
      showToast(`You've left ${facilityName}`, 'success', 4000, `Departed at ${formatTime(new Date())}`);
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'my-holds'] });
    },
  });

  function onLeftClick () {
    markLeftMutation.mutate();
  }

  const createDeflectionMutation = useMutation({
    mutationFn: (data) => Api.deflections.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'my-holds'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'bed-types'] });
      setTab('active');
    },
  });

  const extendAllHoldsMutation = useMutation({
    mutationFn: (deflectionIds) => Api.deflections.extend(deflectionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'my-holds'] });
      showToast('All active holds have been reset to 90 minutes.', 'success');
      setHoldsHighlighted(true);
    },
    onError: () => {
      showToast('Couldn\'t extend holds. Please try again.', 'error');
    },
  });

  function onHoldClick () {
    let bedTypeId;
    if (bedTypes?.length === 1) {
      bedTypeId = bedTypes[0].id;
    } else {
      // TODO
    }
    if (!myHolds?.activeIncidentId) {
      navigate(`/incident${bedTypeId ? `?bedTypeId=${bedTypeId}` : ''}`);
    } else {
      createDeflectionMutation.mutate({
        facilityId: facility.id,
        incidentId: myHolds.activeIncidentId,
        bedTypeId,
      });
    }
  }

  const [selectedDeflections, setSelectedDeflections] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showArrivalConfirmationModal, setShowArrivalConfirmationModal] = useState(false);

  const cancelDeflectionMutation = useMutation({
    mutationFn: async ({ cancelReasonId }) => {
      // Loop so a single reason can be applied across one-or-many holds.
      for (const deflection of selectedDeflections) {
        await Api.deflections.cancel(deflection.id, { cancelReasonId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'my-holds'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'bed-types'] });
      const count = selectedDeflections.length;
      onCloseCancelModal();
      showToast(
        count > 1 ? `${count} holds cancelled` : 'Hold cancelled',
        'success',
        4000,
        count > 1 ? `You cancelled ${count} holds.` : 'You cancelled the hold.'
      );
    },
    onError: (error) => {
      const message = error?.response?.data?.error;
      if (error?.response?.status === 422 && message) {
        showToast(message, 'error');
        return;
      }
      showToast('We couldn’t cancel the hold', 'error', 4000, 'Something went wrong. Try again later.');
    },
  });

  function onCancelHoldClick (deflections) {
    // Accept either a single deflection or an array.
    const list = Array.isArray(deflections) ? deflections : [deflections];
    if (list.length === 0) return;
    setSelectedDeflections(list);
    setShowCancelModal(true);
  }

  useEffect(() => {
    if (!holdsHighlighted) return undefined;
    const timerId = window.setTimeout(() => setHoldsHighlighted(false), 3000);
    return () => window.clearTimeout(timerId);
  }, [holdsHighlighted]);

  async function onCancelHoldConfirmed (cancelReasonId) {
    await cancelDeflectionMutation.mutateAsync({
      cancelReasonId,
    });
  }

  function onCloseCancelModal () {
    setSelectedDeflections([]);
    setShowCancelModal(false);
  }

  function onEditIncidentClick (incidentId) {
    navigate(`/incident/${incidentId}`);
  }

  function onHandoffClick () {
    navigate('/incident/handoff');
  }

  function onExtendActiveHoldsClick () {
    const detainedIds = allActiveDeflections
      .filter(d => d.subjectStatus === 'DETAINED')
      .map(d => d.id);
    if (detainedIds.length > 0) {
      extendAllHoldsMutation.mutate(detainedIds);
    }
  }

  const currentFacility = freshFacility ?? facility;
  const currentBedTypes = bedTypes ?? currentFacility.bedTypes;
  const showActionFooter = true;
  const primaryBedType = currentBedTypes?.[0];
  const isClosed = currentFacility.status === 'CLOSED';
  const isFull = (currentBedTypes?.reduce((sum, bedType) => sum + bedType.available, 0) ?? 0) === 0;
  const isArrivalPending = markArrivedMutation.isPending || markLeftMutation.isPending;
  const isHoldButtonDisabled = (
    !myHolds?.canCreateHold ||
    isArrivalPending ||
    createDeflectionMutation.isPending ||
    isClosed ||
    isFull ||
    !primaryBedType
  );

  return (
    <>
      <Head>
        <title>Holds</title>
      </Head>
      <Container>
        <Stack gap='xl'>
          <Facility
            facility={currentFacility}
            bedTypes={currentBedTypes}
            atFacility={myHolds?.atFacility}
            arrivedAt={myHolds?.arrivedAt}
            canArrive={myHolds?.canArrive}
            canLeave={myHolds?.canLeave}
            onArrivedClick={onArrivedClick}
            onLeftClick={onLeftClick}
            isArrivalPending={isArrivalPending}
          />
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={setTab}
            data={[
              { label: 'Active holds', value: 'active' },
              { label: 'History', value: 'history' },
            ]}
          />
          <FacilityStatusBanner />
          {tab === 'active' && (
            <HoldsActive
              incidents={myHolds?.incidents ?? []}
              onCancelHoldClick={onCancelHoldClick}
              onEditIncidentClick={onEditIncidentClick}
              onHandoffClick={onHandoffClick}
              autoCancelledNotice={autoCancelledNotice}
              onDismissAutoCancelledNotice={onDismissAutoCancelledNotice}
              adminCancelledNotice={adminCancelledNotice}
              onDismissAdminCancelledNotice={onDismissAdminCancelledNotice}
              updatedAtMs={lastSyncedAtMs}
              holdsHighlighted={holdsHighlighted}
              currentUserId={user?.id}
            />
          )}
          {tab === 'history' && (
            <HoldsHistory
              deflections={displayHistoryDeflections}
              isFetchingDeflections={isFetchingInactiveDeflections || isFetchingPostTransferActiveDeflections}
              hasActiveHolds={allActiveDeflections.length > 0}
              currentUserId={user?.id}
            />
          )}
          {tab !== 'active' && (
            <Text size='xs' c='gray.5' align='center'>
              Last updated: {lastSyncedAtMs ? DateTime.fromMillis(lastSyncedAtMs).toLocaleString(DateTime.TIME_SIMPLE) : ''}
            </Text>
          )}
        </Stack>
      </Container>
      {selectedDeflections.length > 0 && (
        <CancelHoldModal
          deflections={selectedDeflections}
          opened={showCancelModal}
          onClose={onCloseCancelModal}
          onConfirm={onCancelHoldConfirmed}
          loading={cancelDeflectionMutation.isPending}
        />
      )}
      {showActionFooter && (
        <ActionFooter>
          <Menu position='top' shadow='sm' radius='lg' width={280} withinPortal>
            <Menu.Target>
              <ActionIcon
                variant='filled'
                color='indigo.0'
                radius='50%'
                size={48}
                aria-label='More actions'
                style={{ minWidth: 48, flex: '0 0 48px' }}
              >
                <IconDots size={24} color='var(--mantine-color-indigo-6)' />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconAlarmPlus size={18} color='var(--mantine-color-gray-5)' />}
                onClick={onExtendActiveHoldsClick}
                disabled={!myHolds?.canExtend || extendAllHoldsMutation.isPending}
              >
                Extend active holds
              </Menu.Item>
              <Menu.Item
                leftSection={<IconScan size={18} color='var(--mantine-color-gray-5)' />}
                onClick={() => setScanHandoffModalOpened(true)}
              >
                Scan a handoff code
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button onClick={onHoldClick} disabled={isHoldButtonDisabled}>
            Hold a {primaryBedType ? t(`bedType.${primaryBedType.type}`).toLocaleLowerCase() : 'bed'}
          </Button>
        </ActionFooter>
      )}
      {showActionFooter && <Box h='120px' />}
      <ArrivalConfirmationModal
        facilityName={facility?.name}
        opened={showArrivalConfirmationModal}
        onClose={onCloseArrivalConfirmationModal}
        onConfirm={onConfirmArrival}
        loading={markArrivedMutation.isPending}
      />
      {scanHandoffModalOpened && (
        <ScanHandoffCodeModal
          opened={scanHandoffModalOpened}
          onClose={() => setScanHandoffModalOpened(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['deflections'] });
            queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'my-holds'] });
            setTab('active');
          }}
        />
      )}
    </>
  );
}

export default Holds;
