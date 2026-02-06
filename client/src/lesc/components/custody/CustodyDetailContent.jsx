import { Accordion, Box, Container, Divider, Group, Image, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { useTranslation } from 'react-i18next';

import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { formatAddress } from '@/utils/format';

function CustodyDetailContent ({ deflection, backTo = '/custody' }) {
  const { t } = useTranslation();

  const name = [deflection?.subject?.firstName, deflection?.subject?.middleInitial, deflection?.subject?.lastName].filter(Boolean).join(' ') || 'Unknown subject';
  const address = formatAddress(deflection?.subject ?? {});

  return (
    <>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to={backTo} />
      </Header>
      <Container>
        <Stack gap='xl'>
          <Text size='md' c='gray.6'>Hold {deflection ? String(deflection.id).padStart(6, '0') : ''}</Text>
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
        </Stack>
      </Container>
    </>
  );
}

export default CustodyDetailContent;
