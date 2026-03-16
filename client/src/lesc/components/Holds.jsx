import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, SegmentedControl, Stack, Text } from '@mantine/core';
import { useNavigate } from 'react-router';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';

import Api from '@/Api';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import useSessionState from '@/hooks/useSessionState';

import CancelHoldModal from './CancelHoldModal';
import Facility from './Facility';
import HoldsActive from './HoldsActive';
import HoldsHistory from './HoldsHistory';
import { SFPD_ACTIVE_SUBJECT_STATUSES, SFPD_HISTORY_ACTIVE_SUBJECT_STATUSES, mergeHistoryDeflections } from './holdsViewModel';

const HOLDS_TOAST_KEY = 'holdsToast';

function Holds () {
  const navigate = useNavigate();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

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

  const historyDeflections = mergeHistoryDeflections(inactiveDeflections ?? [], postTransferActiveDeflections ?? []);

  const [tab, setTab] = useSessionState('holds', 'active');

  useEffect(() => {
    const raw = window.sessionStorage.getItem(HOLDS_TOAST_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      showToast(parsed.title, parsed.variant, 4000, parsed.body);
    } catch {
      showToast('Person details saved', 'success');
    } finally {
      window.sessionStorage.removeItem(HOLDS_TOAST_KEY);
    }
  }, [showToast]);

  const lastSyncedAtMs = Math.max(incidentUpdatedAt ?? 0, deflectionsUpdatedAt ?? 0);

  const markArrivedMutation = useMutation({
    mutationFn: (id) => Api.incidents.arrived(id),
    onSuccess: (response) => {
      queryClient.setQueryData(['facilities', facility.id, 'active-incident'], response.data);
      queryClient.setQueryData(['deflections', incident?.id, 'active'], response.data.deflections);
    },
  });

  function onArrivedClick () {
    if (incident?.id) {
      markArrivedMutation.mutate(incident.id);
    }
  }

  const markLeftMutation = useMutation({
    mutationFn: (id) => Api.incidents.left(id),
    onSuccess: () => {
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
    mutationFn: ({ id }) => Api.incidents.cancel(id),
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

  const isLastActiveHoldSelected = !!selectedDeflection && (deflections?.length ?? 0) === 1;

  const incidentContainsOnlyEmptyHolds = deflections
    ? deflections.every(deflection => !deflection.subjectId)
    : false; // Default false to avoid triggering auto-cancel in a loading/error state

  const shouldCancelIncidentWithHold =
    isLastActiveHoldSelected &&
    !selectedDeflection?.subjectId &&
    incidentContainsOnlyEmptyHolds;

  function onCancelHoldClick (deflection) {
    setSelectedDeflection(deflection);
    setShowCancelModal(true);
  }

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

  function onCloseCancelModal () {
    setSelectedDeflection();
    setShowCancelModal(false);
  }

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
            arrivedAt={incident?.arrivedAt}
            leftAt={incident?.leftAt}
            hasActiveHold={(deflections?.length ?? 0) > 0}
            onArrivedClick={onArrivedClick}
            onLeftClick={onLeftClick}
            onHoldClick={onHoldClick}
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
          {tab === 'active' && (
            <HoldsActive incident={incident} deflections={deflections} isFetchingDeflections={isFetchingDeflections} onCancelHoldClick={onCancelHoldClick} />
          )}
          {tab === 'history' && (
            <HoldsHistory
              deflections={historyDeflections}
              isFetchingDeflections={isFetchingInactiveDeflections || isFetchingPostTransferActiveDeflections}
              incident={incident}
              hasActiveHolds={(deflections?.length ?? 0) > 0}
            />
          )}
          <Text size='xs' c='gray.5' align='center'>
            Last updated: {lastSyncedAtMs ? DateTime.fromMillis(lastSyncedAtMs).toLocaleString(DateTime.TIME_SIMPLE) : ''}
          </Text>
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
    </>
  );
}

export default Holds;
