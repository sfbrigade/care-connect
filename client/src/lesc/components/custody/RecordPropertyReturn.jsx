import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Button, Chip, Container, Group, Image, Input, Stack, Text, Textarea, Title } from '@mantine/core';
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

const REASON_OPTIONS = ['ABANDONED', 'DESTROYED', 'OTHER'];

function RecordPropertyReturn () {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [propertyReturnedSelection, setPropertyReturnedSelection] = useState(null);
  const [propertyNotReturnedReason, setPropertyNotReturnedReason] = useState(null);
  const [propertyNotReturnedOtherReason, setPropertyNotReturnedOtherReason] = useState('');

  const backTo = `/custody/${id}`;

  const { data: deflection } = useQuery({
    queryKey: ['deflections', id],
    queryFn: () => Api.deflections.get(id).then(response => response.data),
  });

  const requiresReason = propertyReturnedSelection === 'no';
  const requiresOtherReason = requiresReason && propertyNotReturnedReason === 'OTHER';
  const canConfirm = canConfirmPropertyReturn({ propertyReturnedSelection, propertyNotReturnedReason, propertyNotReturnedOtherReason });

  const recordPropertyReturnMutation = useMutation({
    mutationFn: () => Api.deflections.recordPropertyReturn(id, {
      propertyReturned: propertyReturnedSelection === 'yes',
      ...(propertyReturnedSelection === 'no' ? { propertyNotReturnedReason } : {}),
      ...(requiresOtherReason ? { propertyNotReturnedOtherReason: propertyNotReturnedOtherReason.trim() } : {}),
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
            <Text size='xl' c='dimmed'>Confirm property return</Text>
            <Title order={3}>Review this property record and confirm whether these items were returned to the subject before they exited RESET.</Title>
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

          <Input.Wrapper
            label='Was this property returned to the person?'
            description='This will be recorded on the exit record.'
          >
            <Chip.Group
              value={propertyReturnedSelection}
              onChange={(value) => {
                setPropertyReturnedSelection(value);
                if (value !== 'no') {
                  setPropertyNotReturnedReason(null);
                  setPropertyNotReturnedOtherReason('');
                }
              }}
            >
              <Group gap='sm'>
                <Chip value='yes'>Yes</Chip>
                <Chip value='no'>No</Chip>
              </Group>
            </Chip.Group>
          </Input.Wrapper>

          {requiresReason && (
            <>
              <Input.Wrapper
                label='Reason'
                required
              >
                <Chip.Group
                  value={propertyNotReturnedReason}
                  onChange={setPropertyNotReturnedReason}
                >
                  <Group gap='sm'>
                    {REASON_OPTIONS.map((option) => (
                      <Chip key={option} value={option}>{t(`propertyNotReturnedReason.${option}`)}</Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </Input.Wrapper>

              {requiresOtherReason && (
                <Input.Wrapper
                  label='Other reason'
                  required
                >
                  <Textarea
                    value={propertyNotReturnedOtherReason}
                    onChange={(event) => setPropertyNotReturnedOtherReason(event.currentTarget.value)}
                    placeholder='For example: Evidence, held by SFPD'
                  />
                </Input.Wrapper>
              )}
            </>
          )}

          <Group gap='sm'>
            <Button
              variant='destructive'
              onClick={() => navigate(backTo)}
              disabled={recordPropertyReturnMutation.isPending}
            >
              Cancel
            </Button>
            <Button
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
