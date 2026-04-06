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
import useSessionState from '@/hooks/useSessionState';
import { formatTime } from '@/utils/format';

import FacilityStatusBanner from '@/components/FacilityStatusBanner';
import CancelHoldModal from './CancelHoldModal';
import CancelIncidentModal from './CancelIncidentModal';
import ArrivalConfirmationModal from './ArrivalConfirmationModal';
import ScanHandoffCodeModal from './ScanHandoffCodeModal';
import Facility from './Facility';
import HoldsActive from './HoldsActive';
import HoldsHistory from './HoldsHistory';
import {
  SFPD_ACTIVE_SUBJECT_STATUSES,
  SFPD_HISTORY_ACTIVE_SUBJECT_STATUSES,
  buildActiveHoldDisplayDeflections,
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

  const { data: bedTypes } = useQuery({
    queryKey: ['facilities', facility.id, 'bed-types'],
    queryFn: () => Api.facilities.bedTypes.index(facility.id).then(response => response.data),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const { data: incident, dataUpdatedAt: incidentUpdatedAt } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const { data: deflections, isFetching: isFetchingDeflections, dataUpdatedAt: deflectionsUpdatedAt } = useQuery({
    queryKey: ['deflections', incident?.id, 'active'],
    queryFn: () => Api.deflections.list({ incidentId: incident.id, active: true, subjectStatus: SFPD_ACTIVE_SUBJECT_STATUSES }).then(response => response.data),
    enabled: !!incident,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

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
  const displayActiveDeflections = buildActiveHoldDisplayDeflections(deflections ?? [], historyDeflections, incident, user?.id);
  const displayHistoryDeflections = buildHistoryDisplayDeflections(historyDeflections, incident, (deflections?.length ?? 0) > 0);

  const [tab, setTab] = useSessionState('holds', 'active');
  const [autoCancelledNoticeState, setAutoCancelledNoticeState] = useSessionState('holds-auto-cancelled-notice', '');
  const autoCancelledNotice = parseAutoCancelledNoticeState(autoCancelledNoticeState);
  const [adminCancelledNoticeState, setAdminCancelledNoticeState] = useSessionState('holds-admin-cancelled-notice', '');
  const adminCancelledNotice = parseAutoCancelledNoticeState(adminCancelledNoticeState);
  const previousActiveIncidentIdRef = useRef(null);
  const previousActiveDeflectionIdsRef = useRef([]);
  const pendingAutoCancelledCheckRef = useRef(null);

  const lastSyncedAtMs = Math.max(incidentUpdatedAt ?? 0, deflectionsUpdatedAt ?? 0);

  useEffect(() => {
    const currentDeflectionIds = (deflections ?? []).map((deflection) => deflection.id);
    const removedDeflectionIds = previousActiveDeflectionIdsRef.current
      .filter((id) => !currentDeflectionIds.includes(id));

    if (removedDeflectionIds.length > 0 && previousActiveIncidentIdRef.current) {
      pendingAutoCancelledCheckRef.current = {
        incidentId: previousActiveIncidentIdRef.current,
        deflectionIds: removedDeflectionIds,
      };
    }

    const pendingCheck = pendingAutoCancelledCheckRef.current;
    const detectedNotice = detectAutoCancelledExpiredHolds({
      previousIncidentId: pendingCheck?.incidentId,
      previousDeflectionIds: pendingCheck?.deflectionIds ?? [],
      currentDeflections: deflections ?? [],
      historyDeflections,
    });

    if (detectedNotice) {
      setAutoCancelledNoticeState(JSON.stringify(detectedNotice));
      pendingAutoCancelledCheckRef.current = null;
    } else if (autoCancelledNotice && incident?.id && autoCancelledNotice.incidentId !== incident.id) {
      setAutoCancelledNoticeState('');
    } else if (adminCancelledNotice && incident?.id && adminCancelledNotice.incidentId !== incident.id) {
      setAdminCancelledNoticeState('');
    } else if (pendingCheck) {
      const matchedHistoryDeflectionCount = historyDeflections
        .filter((deflection) => (
          deflection.incidentId === pendingCheck.incidentId &&
          pendingCheck.deflectionIds.includes(deflection.id)
        ))
        .length;

      if (matchedHistoryDeflectionCount === pendingCheck.deflectionIds.length || (incident?.id && incident.id !== pendingCheck.incidentId)) {
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
              incidentId: previousActiveIncidentIdRef.current,
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

    if (incident?.id) {
      previousActiveIncidentIdRef.current = incident.id;
    }
    previousActiveDeflectionIdsRef.current = currentDeflectionIds;
  }, [
    autoCancelledNotice,
    deflections,
    historyDeflections,
    incident?.id,
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
    mutationFn: (id) => Api.incidents.arrived(id),
    onSuccess: (response) => {
      queryClient.setQueryData(['facilities', facility.id, 'active-incident'], response.data);
      queryClient.setQueryData(['deflections', incident?.id, 'active'], response.data.deflections);
    },
  });

  function onArrivedClick () {
    setShowArrivalConfirmationModal(true);
  }

  function onConfirmArrival () {
    setShowArrivalConfirmationModal(false);
    if (incident?.id) {
      markArrivedMutation.mutate(incident.id);
    }
  }

  function onCloseArrivalConfirmationModal () {
    setShowArrivalConfirmationModal(false);
  }

  const markLeftMutation = useMutation({
    mutationFn: (id) => Api.incidents.left(id),
    onSuccess: (response) => {
      const officerRecord = response?.data?.incidentOfficers?.[0];
      const leftAt = officerRecord?.leftAt ?? response?.data?.leftAt;
      const facilityName = facility?.name ?? 'RESET';
      showToast(`You've left ${facilityName}`, 'success', 4000, `Departed at ${formatTime(leftAt)}`);
      queryClient.setQueryData(['facilities', facility.id, 'active-incident'], null);
    }
  });

  function onLeftClick () {
    if (incident?.id) {
      markLeftMutation.mutate(incident.id);
    }
  }

  const createDeflectionMutation = useMutation({
    mutationFn: (data) => Api.deflections.create(data),
    onSuccess: (response) => {
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        queryClient.setQueryData(['deflections', incident?.id, 'active'], [response.data, ...cachedDeflections]);
      }
      queryClient.invalidateQueries(['facilities', facility.id, 'bed-types']);
    },
  });

  const extendAllHoldsMutation = useMutation({
    mutationFn: (id) => Api.incidents.extend(id),
    onSuccess: (response) => {
      queryClient.setQueryData(['deflections', incident?.id, 'active'], response.data);
      showToast('All active holds have been reset to 60 minutes.', 'success');
      setHoldsHighlighted(true);
    },
    onError: () => {
      showToast('Couldn’t extend holds. Please try again.', 'error');
    },
  });

  function onHoldClick () {
    let bedTypeId;
    if (bedTypes?.length === 1) {
      bedTypeId = bedTypes[0].id;
    } else {
      // TODO
    }
    if (!incident) {
      navigate(`/incident${bedTypeId ? `?bedTypeId=${bedTypeId}` : ''}`);
    } else {
      createDeflectionMutation.mutate({
        facilityId: facility.id,
        incidentId: incident.id,
        bedTypeId,
      });
    }
  }

  const [selectedDeflection, setSelectedDeflection] = useState();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showArrivalConfirmationModal, setShowArrivalConfirmationModal] = useState(false);

  const cancelDeflectionMutation = useMutation({
    mutationFn: (data) => Api.deflections.cancel(selectedDeflection.id, data),
    onSuccess: () => {
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        const updatedDeflections = cachedDeflections.filter(deflection => deflection.id !== selectedDeflection.id);
        queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
        if (updatedDeflections.length === 0 && !incident?.arrivedAt) {
          queryClient.setQueryData(['facilities', facility.id, 'active-incident'], null);
        }
      }
      queryClient.invalidateQueries(['facilities', facility.id, 'bed-types']);
      onCloseCancelModal();
      showToast('Hold cancelled', 'success', 4000, 'You cancelled the hold.');
    },
  });

  const cancelIncidentMutation = useMutation({
    mutationFn: ({ id, cancelReasonId }) => Api.incidents.cancel(id, cancelReasonId ? { cancelReasonId } : undefined),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['facilities', facility.id, 'bed-types'],
        }),
        queryClient.setQueryData(
          ['facilities', facility.id, 'active-incident'],
          null
        ),
        queryClient.removeQueries({
          queryKey: ['deflections', incident?.id, 'active'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['deflections', facility.id, 'inactive'],
        }),
      ]);

      onCloseCancelModal();
      showToast('Incident canceled', 'success', 4000, 'Any chairs have been released. Ready for new incident.');
    },
    onError: (error) => {
      // Axios-specific: errors with no `response` property did not receive a server response
      const isNetworkError = !error?.response;

      if (isNetworkError) {
        showToast('Connection failure', 'warning', 4000, 'Failed to cancel incident. Check your connection and try again.');
        return;
      }

      showToast('We couldn\'t cancel the incident', 'error', 4000, 'Something went wrong. Try again later.');
    },
  });

  const permissions = incident?.permissions ?? { isCreator: true, canCreateHold: true, canHandoff: false, totalActiveHolds: 0 };

  const isLastHoldOnIncident = (permissions.totalActiveHolds ?? 0) <= 1;
  const incidentContainsOnlyEmptyHolds = deflections
    ? deflections.every(deflection => !deflection.subjectId)
    : false;

  const shouldCancelIncidentWithHold =
    permissions.canCancelIncident &&
    !!selectedDeflection &&
    isLastHoldOnIncident &&
    !selectedDeflection?.subjectId &&
    incidentContainsOnlyEmptyHolds;

  function onCancelHoldClick (deflection) {
    setSelectedDeflection(deflection);
    setShowCancelModal(true);
  }

  useEffect(() => {
    if (!holdsHighlighted) return undefined;
    const timerId = window.setTimeout(() => setHoldsHighlighted(false), 3000);
    return () => window.clearTimeout(timerId);
  }, [holdsHighlighted]);

  async function onCancelHoldConfirmed (cancelReasonId) {
    if (shouldCancelIncidentWithHold && incident?.id) {
      await cancelIncidentMutation.mutateAsync({
        id: incident.id,
      });
      return;
    }

    await cancelDeflectionMutation.mutateAsync({
      cancelReasonId,
    });
  }

  async function onCancelIncidentConfirmed (cancelReasonId) {
    if (incident?.id) {
      await cancelIncidentMutation.mutateAsync({
        id: incident.id,
        cancelReasonId,
      });
    }
  }

  function onCloseCancelModal () {
    setSelectedDeflection();
    setShowCancelModal(false);
  }

  function onOpenCancelIncidentModal () {
    setSelectedDeflection();
    setShowCancelModal(true);
  }

  function onEditIncidentClick () {
    navigate('/incident');
  }

  function onHandoffClick () {
    navigate('/incident/handoff');
  }

  function onExtendActiveHoldsClick () {
    if (incident?.id) {
      extendAllHoldsMutation.mutate(incident.id);
    }
  }

  const showActionFooter = true;
  const primaryBedType = (bedTypes ?? facility.bedTypes)?.[0];
  const isClosed = facility.status === 'CLOSED';
  const isFull = ((bedTypes ?? facility.bedTypes)?.reduce((sum, bedType) => sum + bedType.available, 0) ?? 0) === 0;
  const myOfficerRecord = incident?.incidentOfficers?.[0];
  const myArrivedAt = myOfficerRecord ? myOfficerRecord.arrivedAt : incident?.arrivedAt;
  const myLeftAt = myOfficerRecord ? myOfficerRecord.leftAt : incident?.leftAt;
  const hasArrived = !!myArrivedAt;
  const hasLeft = !!myLeftAt;
  const isHoldButtonDisabled = (
    !permissions.canCreateHold ||
    markArrivedMutation.isPending ||
    markLeftMutation.isPending ||
    createDeflectionMutation.isPending ||
    isClosed ||
    isFull ||
    !primaryBedType ||
    (hasArrived && !hasLeft)
  );
  const showExtendActiveHoldsAction = (displayActiveDeflections?.length ?? 0) > 0;
  const incidentHasDetailedHolds = !!displayActiveDeflections?.some(deflection => deflection.subjectId);

  return (
    <>
      <Head>
        <title>Holds</title>
      </Head>
      <Container>
        <Stack gap='xl'>
          <Facility
            facility={facility}
            bedTypes={bedTypes ?? facility.bedTypes}
            arrivedAt={myArrivedAt}
            leftAt={myLeftAt}
            hasActiveHold={(deflections?.length ?? 0) > 0}
            onArrivedClick={onArrivedClick}
            onLeftClick={onLeftClick}
            isPending={markArrivedMutation.isPending || markLeftMutation.isPending || createDeflectionMutation.isPending}
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
              incident={incident}
              deflections={displayActiveDeflections}
              isFetchingDeflections={isFetchingDeflections}
              onCancelHoldClick={onCancelHoldClick}
              onEditIncidentClick={permissions.canEditIncident ? onEditIncidentClick : undefined}
              onHandoffClick={permissions.canHandoff ? onHandoffClick : undefined}
              onCancelIncidentClick={permissions.canCancelIncident ? onOpenCancelIncidentModal : undefined}
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
              incident={incident}
              hasActiveHolds={(deflections?.length ?? 0) > 0}
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
      {selectedDeflection && (
        <CancelHoldModal
          deflection={selectedDeflection}
          opened={showCancelModal}
          onClose={onCloseCancelModal}
          onConfirm={onCancelHoldConfirmed}
          lastHoldWillCancelIncident={shouldCancelIncidentWithHold}
          loading={cancelDeflectionMutation.isPending || cancelIncidentMutation.isPending}
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
              {showExtendActiveHoldsAction && (
                <Menu.Item
                  leftSection={<IconAlarmPlus size={18} color='var(--mantine-color-gray-5)' />}
                  onClick={onExtendActiveHoldsClick}
                  disabled={extendAllHoldsMutation.isPending}
                >
                  Extend active holds
                </Menu.Item>
              )}
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
      {!selectedDeflection && incident && (
        <CancelIncidentModal
          opened={showCancelModal}
          onClose={onCloseCancelModal}
          onConfirm={onCancelIncidentConfirmed}
          requiresReason={incidentHasDetailedHolds}
          loading={cancelIncidentMutation.isPending}
        />
      )}
      {scanHandoffModalOpened && (
        <ScanHandoffCodeModal
          opened={scanHandoffModalOpened}
          onClose={() => setScanHandoffModalOpened(false)}
          onSuccess={() => {
            setScanHandoffModalOpened(false);
            queryClient.invalidateQueries({ queryKey: ['deflections'] });
            queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'active-incident'] });
            setTab('active');
          }}
        />
      )}
    </>
  );
}

export default Holds;
