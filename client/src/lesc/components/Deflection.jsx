import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Head } from '@unhead/react';
import { Accordion, Box, Button, Container, Divider, Group, Image, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import CancelHoldModal from './CancelHoldModal';
import CancelIncidentModal from './CancelIncidentModal';
import Header from '@/components/Header';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { formatAddress, formatDateTime } from '@/utils/format';
import { hasMeaningfulHoldData } from './holdDataUtils';
import { generate647fTransferFormPDF } from '@/utils/pdfGenerator';

function Deflection () {
  const { id } = useParams();
  const { facility } = useFacilityContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: incident } = useQuery({
    queryKey: ['facilities', facility.id, 'active-incident'],
    queryFn: () => Api.facilities.activeIncident(facility.id).then(response => response.data),
  });

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const { data: activeDeflections, isFetching: isFetchingActiveDeflections } = useQuery({
    queryKey: ['deflections', incident?.id, 'active'],
    queryFn: () => Api.deflections.list({ incidentId: incident.id, active: true }).then(response => response.data),
    enabled: !!incident,
  });

  const name = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Person X';
  const address = formatAddress(deflection?.subject ?? {});
  const incidentAddress = formatAddress(incident ?? {});

  const [showCancelModal, setShowCancelModal] = useState(false);

  const cancelDeflectionMutation = useMutation({
    mutationFn: (data) => Api.deflections.cancel(id, data),
    onSuccess: () => {
      const cachedDeflections = queryClient.getQueryData(['deflections', incident?.id, 'active']);
      if (cachedDeflections) {
        const updatedDeflections = cachedDeflections.filter(deflection => deflection.id !== id);
        queryClient.setQueryData(['deflections', incident?.id, 'active'], updatedDeflections);
        if (updatedDeflections.length === 0 && !incident?.arrivedAt) {
          queryClient.invalidateQueries(['facilities', facility.id, 'active-incident']);
        }
      }
      queryClient.invalidateQueries(['facilities', facility.id, 'bed-types']);
      setShowCancelModal(false);
      showToast('Hold cancelled', 'success', 4000, `You cancelled the hold for ${name}.`);
      navigate('/holds');
    },
  });

  const cancelIncidentMutation = useMutation({
    mutationFn: ({ incidentId, cancelReasonId }) => Api.incidents.cancel(incidentId, { cancelReasonId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['facilities', facility.id, 'bed-types'],
      });
      await queryClient.setQueryData(
        ['facilities', facility.id, 'active-incident'],
        null
      );
      await queryClient.removeQueries({
        queryKey: ['deflections', incident?.id, 'active'],
      });
      await queryClient.removeQueries({
        queryKey: ['deflections', incident?.id, 'all'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['deflections', facility.id, 'inactive'],
      });
      setShowCancelModal(false);
      showToast('Incident canceled', 'success', 4000, 'Any chairs have been released. Ready for new incident.');
      navigate('/holds');
    },
    onError: (error) => {
      const isNetworkError = !error?.response;

      if (isNetworkError) {
        showToast('Connection failure', 'warning', 4000, 'Failed to cancel incident. Check your connection and try again.');
        return;
      }

      showToast('We couldn’t cancel the incident', 'error', 4000, 'Something went wrong. Try again later.');
    },
  });

  const activeHoldsCount = activeDeflections?.length;
  const isLastActiveDetailedHold =
    hasMeaningfulHoldData(deflection) &&
    deflection?.status === 'ACTIVE' &&
    activeHoldsCount === 1;

  async function onCancelHoldConfirmed (cancelReasonId) {
    if (isLastActiveDetailedHold && incident?.id) {
      await cancelIncidentMutation.mutateAsync({
        incidentId: incident.id,
        cancelReasonId,
      });
      return;
    }

    await cancelDeflectionMutation.mutateAsync({
      cancelReasonId,
    });
  }

  function on647fClick () {
    try {
      const doc = generate647fTransferFormPDF(deflection, facility);
      // Open PDF in browser
      doc.output('dataurlnewwindow');
      showToast('647(f) Transfer Form opened in new window', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF', 'error');
    }
  }

  return (
    <>
      <Head>
        <title>Details</title>
      </Head>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to='/holds' />
      </Header>
      <Container>
        <Stack gap='xl'>
          <Group gap='xs'>
            <Text size='md'>Incident {incident ? String(incident.id).padStart(6, '0') : ''}</Text>
            <Text c='gray.5' size='md'>•</Text>
            <Text size='md' c='dimmed'>Hold {deflection ? String(deflection.id).padStart(6, '0') : ''}</Text>
          </Group>
          {deflection?.subjectStatus === 'ONSITE_AWAITING_TRANSFER' && (
            <>
              <Group>
                <Button onClick={on647fClick} variant='outline' size='md'>647(f).pdf</Button>
              </Group>
            </>
          )}
          <Stack gap='sm'>
            <Title order={2}>{name}</Title>
            {deflection?.subject?.dateOfBirth && (
              <Box>
                <Text c='dimmed'>Date of birth</Text>
                <Text>{DateTime.fromISO(deflection.subject.dateOfBirth, { setZone: true }).toLocaleString(DateTime.DATE_SHORT)}</Text>
              </Box>
            )}
            {deflection?.subject?.sex && (
              <Box>
                <Text c='dimmed'>Sex</Text>
                <Text>{t(`sex.${deflection.subject.sex}`)}</Text>
              </Box>
            )}
            {deflection?.subject?.race && (
              <Box>
                <Text c='dimmed'>Race</Text>
                <Text>{t(`race.${deflection.subject.race}`)}</Text>
              </Box>
            )}
            {deflection?.subject?.driverLicense && (
              <Box>
                <Text c='dimmed'>Driver's license number</Text>
                <Text>{deflection.subject.driverLicense}</Text>
              </Box>
            )}
            {address && (
              <Box>
                <Text c='dimmed'>Address</Text>
                <Text>{address}</Text>
              </Box>
            )}
            <Group mt='md'>
              <Button onClick={() => navigate(`/holds/${deflection?.id}/subject`)} variant='secondary'>Edit subject</Button>
            </Group>
          </Stack>
          <Accordion variant='section' defaultValue={['narcotics', 'deflection', 'property', 'incident']}>
            <Divider />
            <Accordion.Item value='narcotics'>
              <Accordion.Control>
                <Title order={3}>Narcotics</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  {deflection?.narcoticsSubstance !== null && deflection?.narcoticsSubstance !== undefined && (
                    <Box>
                      <Text c='dimmed'>Controlled substance</Text>
                      <Text c={deflection.narcoticsSubstance ? 'red.6' : 'teal.6'}>{deflection.narcoticsSubstance ? 'Yes' : 'No'}</Text>
                    </Box>
                  )}
                  {deflection?.narcoticsParaphernalia !== null && deflection?.narcoticsParaphernalia !== undefined && (
                    <Box>
                      <Text c='dimmed'>Paraphernalia</Text>
                      <Text c={deflection.narcoticsParaphernalia ? 'red.6' : 'teal.6'}>{deflection.narcoticsParaphernalia ? 'Yes' : 'No'}</Text>
                    </Box>
                  )}
                </Stack>
                <Group mt='md'>
                  <Button onClick={() => navigate(`/holds/${deflection?.id}/narcotics`)} variant='secondary'>Edit narcotics</Button>
                </Group>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='deflection'>
              <Accordion.Control>
                <Title order={3}>Deflection details</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  {!!deflection?.deflectionDetails?.length && (
                    <Box>
                      <Text c='dimmed'>Selected observations</Text>
                      <Text>{deflection?.deflectionDetails?.map(detail => detail.name).join('; ')}</Text>
                    </Box>
                  )}
                  {!!deflection?.behavior && (
                    <Box>
                      <Text c='dimmed'>Narrative (arrestable behavior)</Text>
                      <Text>{deflection?.behavior}</Text>
                    </Box>
                  )}
                </Stack>
                <Group mt='md'>
                  <Button onClick={() => navigate(`/holds/${deflection?.id}/deflection`)} variant='secondary'>Edit deflection</Button>
                </Group>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='property'>
              <Accordion.Control>
                <Title order={3}>Property details</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  {!!deflection?.propertyPhotos?.length && (
                    <Group gap='sm'>
                      {deflection?.propertyPhotos?.map(photo => (
                        <Image
                          key={photo.id}
                          src={photo.fileUrl}
                          w={160}
                          h='auto'
                          fit='contain'
                        />
                      ))}
                    </Group>
                  )}
                  {!!deflection?.property && (
                    <Box>
                      <Text c='dimmed'>Volume of property</Text>
                      <Text>{t(`property.${deflection?.property}`)}</Text>
                    </Box>
                  )}
                  {!!deflection?.propertyDetails && (
                    <Box>
                      <Text c='dimmed'>Description</Text>
                      <Text>{deflection?.propertyDetails}</Text>
                    </Box>
                  )}
                </Stack>
                <Group mt='md'>
                  <Button onClick={() => navigate(`/holds/${deflection?.id}/property`)} variant='secondary'>Edit property</Button>
                </Group>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value='incident'>
              <Accordion.Control>
                <Title order={3}>Incident details</Title>
                <Text c='gray.5' size='sm'>These details apply to all holds in this incident.</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap='sm'>
                  {incidentAddress && (
                    <Box>
                      <Text c='dimmed'>Arrest location</Text>
                      <Text>{incidentAddress}</Text>
                    </Box>
                  )}
                  {incident?.arrestedAt && (
                    <Box>
                      <Text c='dimmed'>Arrest date & time</Text>
                      <Text>{formatDateTime(incident.arrestedAt)}</Text>
                    </Box>
                  )}
                  {incident?.cadNumber && (
                    <Box>
                      <Text c='dimmed'>CAD number</Text>
                      <Text>{incident?.cadNumber}</Text>
                    </Box>
                  )}
                  {incident?.supervisorBadgeNumber && (
                    <Box>
                      <Text c='dimmed'>Supervising Sergeant's Star Number</Text>
                      <Text>{incident?.supervisorBadgeNumber}</Text>
                    </Box>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          <Group mb='xl'>
            <Button onClick={() => setShowCancelModal(true)} variant='destructive' disabled={isFetchingActiveDeflections}>Cancel hold</Button>
          </Group>
        </Stack>
      </Container>
      {!!deflection && showCancelModal && (!isLastActiveDetailedHold) && (
        <CancelHoldModal
          deflection={deflection}
          opened={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={onCancelHoldConfirmed}
          loading={cancelDeflectionMutation.isPending || isFetchingActiveDeflections}
        />
      )}
      {!!deflection && showCancelModal && isLastActiveDetailedHold && (
        <CancelIncidentModal
          opened={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={onCancelHoldConfirmed}
          requiresReason
          isLastHoldDetailedCancellation
          loading={cancelIncidentMutation.isPending}
        />
      )}
    </>
  );
}

export default Deflection;
