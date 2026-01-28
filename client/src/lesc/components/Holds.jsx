import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, SegmentedControl, Stack, Text } from '@mantine/core';
import { useNavigate } from 'react-router';
import { DateTime } from 'luxon';
import { Head } from '@unhead/react';

import Api from '@/Api';
import CancelHoldModal from './CancelHoldModal';
import Facility from './Facility';
import HoldsActive from './HoldsActive';
import HoldsHistory from './HoldsHistory';

import { useFacilityContext } from '@/FacilityContext';

function Holds () {
  const navigate = useNavigate();
  const { facility } = useFacilityContext();
  const queryClient = useQueryClient();

  const { data: bedTypes } = useQuery({
    queryKey: ['facilities', facility.id, 'bed-types'],
    queryFn: () => Api.facilities.bedTypes.index(facility.id).then(response => response.data),
  });

  const { data: incident } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });

  const [tab, setTab] = useState('active');

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
    onSuccess: (response) => {
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
    onSuccess: (response) => {
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        queryClient.setQueryData(['deflections', incident?.id, 'active'], cachedDeflections.filter(deflection => deflection.id !== selectedDeflection.id));
      }
      queryClient.invalidateQueries(['facilities', facility.id, 'bed-types']);
      onCloseCancelModal();
    },
  });

  function onCancelHoldClick (deflection) {
    setSelectedDeflection(deflection);
    setShowCancelModal(true);
  }

  async function onCancelHoldConfirmed (cancelReasonId) {
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
            onArrivedClick={onArrivedClick}
            onLeftClick={onLeftClick}
            onHoldClick={onHoldClick}
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
            <HoldsActive incident={incident} onCancelHoldClick={onCancelHoldClick} />
          )}
          {tab === 'history' && (
            <HoldsHistory facility={facility} />
          )}
          <Text size='xs' c='gray.5' align='center'>
            Last updated: {facility?.updatedAt ? DateTime.fromISO(facility.updatedAt).toLocaleString(DateTime.TIME_SIMPLE) : ''}
          </Text>
        </Stack>
      </Container>
      {selectedDeflection && (
        <CancelHoldModal
          deflection={selectedDeflection}
          opened={showCancelModal}
          onClose={onCloseCancelModal}
          onConfirm={onCancelHoldConfirmed}
        />
      )}
    </>
  );
}

export default Holds;
