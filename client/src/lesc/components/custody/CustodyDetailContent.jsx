import { useNavigate } from 'react-router';
import { Accordion, Box, Button, Card, Container, Divider, Group, Image, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconExternalLink } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import LockedQRCode from '@/components/LockedQRCode';
import { useToast } from '@/components/ToastContext';
import { useFacilityContext } from '@/FacilityContext';
import { formatAddress } from '@/utils/format';
import { generate647fTransferFormPDF } from '@/utils/pdfGenerator';

const RELEASABLE_STATUSES = ['AWAITING_INTAKE', 'READY_FOR_INTAKE', 'ADMITTED', 'IN_CHAIR'];

function CustodyDetailContent ({ deflection, backTo = '/custody' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { facility } = useFacilityContext();
  const { showToast } = useToast();

  const isAwaitingSafetyCheck = deflection?.subjectStatus === 'AWAITING_INTAKE';
  const isReadyForIntake = deflection?.subjectStatus === 'READY_FOR_INTAKE';
  const transferUrl = deflection ? `${window.location.origin}/admit/${deflection.id}` : '';

  const safetyCheckMutation = useMutation({
    mutationFn: () => Api.deflections.safetyCheck(deflection.id),
    onSuccess: () => {
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflection.id));
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['deflections', String(deflection.id)] });
      showToast('Safety check completed', 'success', 4000, 'Subject is ready for medical intake.');
    },
    onError: () => {
      showToast('Safety check not saved. Please try again.', 'error');
    },
  });

  const releaseMutation = useMutation({
    mutationFn: () => Api.deflections.release(deflection.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deflections', facility.id] });
      queryClient.invalidateQueries({ queryKey: ['deflections', String(deflection.id)] });
      showToast('Subject legally released', 'success');
      navigate('/custody');
    },
    onError: () => {
      showToast('Release not saved. Please try again.', 'error');
    },
  });

  const isReleasable = RELEASABLE_STATUSES.includes(deflection?.subjectStatus);

  const name = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown subject';
  const address = formatAddress(deflection?.subject ?? {});

  function open647fPdf () {
    const holdData = {
      id: String(deflection.id),
      client: deflection.subject,
      incident: {},
      createdBy: null,
      notes: deflection.behavior,
    };
    const doc = generate647fTransferFormPDF(holdData);
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }

  return (
    <>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to={backTo} />
      </Header>
      <Container>
        <Stack gap='xl'>
          <Group gap='xs'>
            {deflection?.incidentId && <Text size='md'>Incident {String(deflection.incidentId).padStart(6, '0')}</Text>}
            {deflection?.incidentId && <Text c='gray.5' size='md'>&middot;</Text>}
            <Text size='md' c='gray.6'>Hold {deflection ? String(deflection.id).padStart(6, '0') : ''}</Text>
          </Group>
          {(isAwaitingSafetyCheck || isReadyForIntake) && (
            <Card bg='white' p={32} withBorder style={{ alignSelf: 'center' }}>
              <Stack gap='md' align='center'>
                <LockedQRCode value={transferUrl} locked={!isReadyForIntake} />
                <Text fw={500}>Transfer code: {isReadyForIntake ? String(deflection.id).padStart(6, '0') : '******'}</Text>
                {isAwaitingSafetyCheck && (
                  <Text size='sm' c='dimmed' ta='center'>QR locked — finish Safety check to enable.</Text>
                )}
              </Stack>
            </Card>
          )}
          <Stack gap='xs' align='flex-start'>
            {isAwaitingSafetyCheck && (
              <Button onClick={() => safetyCheckMutation.mutate()} loading={safetyCheckMutation.isPending}>
                Mark safety check complete
              </Button>
            )}
            <Button
              onClick={open647fPdf}
              variant='outline'
              rightSection={<IconExternalLink size={18} style={{ flexShrink: 0, marginLeft: 4 }} />}
            >
              647(f).pdf
            </Button>
          </Stack>
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
              <Button onClick={() => navigate(`/custody/${deflection?.id}/subject`)} variant='secondary'>Edit details</Button>
            </Group>
          </Stack>
          <Accordion variant='section' defaultValue={['narcotics', 'deflection', 'property']}>
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
                  <Group mt='sm'>
                    <Button onClick={() => navigate(`/custody/${deflection?.id}/subject?section=narcotics`)} variant='secondary' size='sm'>Edit</Button>
                  </Group>
                </Stack>
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
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          {isReleasable && (
            <Button
              size='lg'
              onClick={() => releaseMutation.mutate()}
              loading={releaseMutation.isPending}
            >
              Mark as legally released
            </Button>
          )}
        </Stack>
      </Container>
    </>
  );
}

export default CustodyDetailContent;
