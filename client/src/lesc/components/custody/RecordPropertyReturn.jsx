import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Button, Chip, Container, Group, Image, Stack, Text, TextInput, Title } from '@mantine/core';
import { Head } from '@unhead/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Api from '@/Api';
import Header from '@/components/Header';
import IconButtonLink from '@/components/IconButtonLink';
import { useToast } from '@/components/ToastContext';
import { IconArrowLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { canConfirmPropertyReturn, getPropertyReturnErrorToast } from './propertyReturnUtils';

const PROPERTY_RETURN_TOAST_KEY = 'custodyPropertyReturnToast';

const REASON_OPTIONS = [
  { value: 'ABANDONED', label: 'Abandoned' },
  { value: 'DESTROYED', label: 'Destroyed' },
  { value: 'OTHER', label: 'Other (please specify)' },
];

function RecordPropertyReturn () {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [returnedSelection, setReturnedSelection] = useState(null);
  const [reason, setReason] = useState(null);
  const [otherReason, setOtherReason] = useState('');

  const backTo = `/custody/${id}`;

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const requiresReason = returnedSelection === 'no';
  const requiresOtherReason = requiresReason && reason === 'OTHER';
  const canConfirm = canConfirmPropertyReturn({ returnedSelection, reason, otherReason });

  const recordPropertyReturnMutation = useMutation({
    mutationFn: () => Api.deflections.recordPropertyReturn(id, {
      returned: returnedSelection === 'yes',
      ...(returnedSelection === 'no' ? { reason } : {}),
      ...(requiresOtherReason ? { otherReason: otherReason.trim() } : {}),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deflections', String(id)] });
      queryClient.invalidateQueries({ queryKey: ['deflections'] });
      window.sessionStorage.setItem(PROPERTY_RETURN_TOAST_KEY, JSON.stringify({ deflectionId: String(id) }));
      navigate(backTo);
    },
    onError: (error) => {
      const toast = getPropertyReturnErrorToast(error);
      showToast(toast.title, toast.variant, toast.timeout, toast.body);
    },
  });

  return (
    <>
      <Head>
        <title>Record Property Return</title>
      </Head>
      <Header>
        <IconButtonLink icon={IconArrowLeft} to={backTo} />
      </Header>
      <Container>
        <Stack gap='xl'>
          <Stack gap={0}>
            <Text size='xl' fz='xl' c='dimmed'>Confirm property return</Text>
            <Title order={2} fz={24} lh='32px' fw={400}>Review this property record and confirm whether these items were returned to the subject before they exited RESET.</Title>
          </Stack>

          <Stack gap='sm'>
            {!!deflection?.propertyPhotos?.length && (
              <Image
                src={deflection.propertyPhotos[0].fileUrl}
                w={160}
                h={160}
                radius='sm'
                fit='cover'
              />
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

          <Stack gap='sm'>
            <Box px={4}>
              <Text fw={600} size='lg'>Was this property returned to the person?</Text>
              <Text c='dimmed'>This will be recorded on the exit record.</Text>
            </Box>
            <Chip.Group
              value={returnedSelection}
              onChange={(value) => {
                setReturnedSelection(value);
                if (value !== 'no') {
                  setReason(null);
                  setOtherReason('');
                }
              }}
            >
              <Group gap='sm'>
                <Chip value='yes'>Yes</Chip>
                <Chip value='no'>No</Chip>
              </Group>
            </Chip.Group>
          </Stack>

          {requiresReason && (
            <>
              <Stack gap='sm'>
                <Box px={4}>
                  <Text fw={600} size='lg'>Reason<Text span c='red.6'>*</Text></Text>
                </Box>
                <Chip.Group value={reason} onChange={setReason}>
                  <Group gap='sm'>
                    {REASON_OPTIONS.map((option) => (
                      <Chip key={option.value} value={option.value}>{option.label}</Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </Stack>

              {requiresOtherReason && (
                <Stack gap={4}>
                  <Text fw={600} size='lg'>Other reason</Text>
                  <TextInput
                    value={otherReason}
                    onChange={(event) => setOtherReason(event.currentTarget.value)}
                    placeholder='For example: Evidence, held by SFPD'
                  />
                </Stack>
              )}
            </>
          )}

          <Group gap='sm'>
            <Button
              variant='light'
              color='red'
              radius='xl'
              size='lg'
              onClick={() => navigate(backTo)}
              disabled={recordPropertyReturnMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              color='indigo'
              radius='xl'
              size='lg'
              onClick={() => recordPropertyReturnMutation.mutate()}
              disabled={!canConfirm}
              loading={recordPropertyReturnMutation.isPending}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      </Container>
    </>
  );
}

export default RecordPropertyReturn;
