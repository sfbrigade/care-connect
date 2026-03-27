import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Chip, Group, NumberInput, Stack, Text, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router';

import Api from '@/Api';
import { useToast } from '@/components/ToastContext';

function AdjustAvailability ({ facility, bedType, onCancel }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: reasons } = useQuery({
    queryKey: ['bed-type-unavailable-reasons'],
    queryFn: () => Api.facilities.bedTypeUnavailableReasons.index().then(r => r.data),
  });

  const form = useForm({
    mode: 'controlled',
    initialValues: {
      unavailableUnoccupied: bedType.unavailableUnoccupied || '',
      unavailableReasonId: bedType.unavailableReasonId || null,
      unavailableOther: bedType.unavailableOther || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values) => Api.facilities.bedTypes.update(facility.id, bedType.id, values),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['facilities', facility.id, 'bed-types'] });
      const count = response.data.unavailableUnoccupied;
      const previousCount = bedType.unavailableUnoccupied;
      const freed = previousCount - count;
      const message = freed > 0
        ? `${freed} chair${freed !== 1 ? 's' : ''} are now available.`
        : `${count} chair${count !== 1 ? 's' : ''} marked unavailable.`;
      showToast('Capacity updated', 'success', 4000, message);
      navigate('/');
    },
    onError: () => {
      showToast("Couldn't update capacity", 'error', 4000, 'Please try again.');
    },
  });

  const { unavailableUnoccupied: unavailableCount, unavailableReasonId } = form.getValues();
  const selectedReason = reasons?.find(r => r.id === unavailableReasonId);
  const isOtherReason = selectedReason?.description === 'Other (specify)';
  const hasCount = typeof unavailableCount === 'number' && unavailableCount >= 0;
  const needsReason = hasCount && unavailableCount > 0;
  const hasReason = !!unavailableReasonId;

  // Preview: how many holds would be cancelled
  const newAvailable = hasCount
    ? bedType.capacity - unavailableCount - bedType.unavailableOccupied - bedType.occupied
    : null;
  const holdsToCancel = newAvailable !== null && newAvailable < bedType.holds
    ? bedType.holds - Math.max(0, newAvailable)
    : 0;

  const isValid = hasCount && (!needsReason || hasReason);

  return (
    <form onSubmit={form.onSubmit((values) => mutation.mutateAsync(values))}>
      <Stack>
        <NumberInput
          label='Unavailable chairs'
          placeholder='Enter a number'
          min={0}
          max={bedType.capacity - bedType.occupied}
          required
          {...form.getInputProps('unavailableUnoccupied')}
        />
        <Text size='sm' c='dimmed'>These chairs will be marked unavailable.</Text>

        {needsReason && (
          <>
            <Text fw={700}>Reason<Text span c='red'> *</Text></Text>
            <Chip.Group
              multiple={false}
              {...form.getInputProps('unavailableReasonId')}
            >
              <Stack gap='xs' align='flex-start'>
                {reasons?.map((reason) => (
                  <Chip key={reason.id} value={reason.id}>{reason.description}</Chip>
                ))}
              </Stack>
            </Chip.Group>

            {isOtherReason && (
              <Textarea
                label='Other reason (optional)'
                {...form.getInputProps('unavailableOther')}
              />
            )}
          </>
        )}

        {hasCount && holdsToCancel > 0 && (
          <Text c='red' size='sm' fw={500}>
            This will cancel {holdsToCancel} in-transit hold{holdsToCancel !== 1 ? 's' : ''} to prevent overbooking.
          </Text>
        )}

        {hasCount && unavailableCount !== bedType.unavailableUnoccupied && (() => {
          const delta = unavailableCount - bedType.unavailableUnoccupied;
          if (delta > 0) {
            return (
              <Text size='sm' c='dimmed'>
                This will mark {delta} more chair{delta !== 1 ? 's' : ''} unavailable.
              </Text>
            );
          }
          const freed = Math.abs(delta);
          return (
            <Text size='sm' c='dimmed'>
              This will make {freed} chair{freed !== 1 ? 's' : ''} available.
            </Text>
          );
        })()}

        <Group>
          <Button variant='subtle' color='red' onClick={onCancel}>Cancel</Button>
          <Button
            type='submit'
            disabled={!isValid}
            loading={mutation.isPending}
          >
            Update availability
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default AdjustAvailability;
