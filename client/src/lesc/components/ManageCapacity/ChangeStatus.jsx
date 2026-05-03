import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Chip, Group, Stack, Text, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';
import { useToast } from '@/components/ToastContext';

const STATUS_OPTIONS = [
  { value: 'OPEN_ACCEPTING', label: 'Open' },
  { value: 'OPEN_NOT_ACCEPTING', label: 'Not accepting new holds' },
  { value: 'CLOSED', label: 'Closed' },
];

const STATUS_INFO = {
  OPEN_NOT_ACCEPTING: 'Not accepting new holds: New holds are blocked. Existing workflows continue.',
  CLOSED: 'Closed: All in-transit holds will be cancelled. No new holds can be created.',
};

const FACILITY_STATUS_REASON_FACILITY_TYPE = {
  SFSO_STAFFING: 'LESC',
  CONNECTIONS_STAFFING: 'LESC',
};

function ChangeStatus ({ facility, onCancel }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const allReasons = Object.entries(t('facilityStatusReason', { returnObjects: true }))
    .map(([id, description]) => ({ id, description }));
  const reasons = allReasons.filter(r => !FACILITY_STATUS_REASON_FACILITY_TYPE[r.id] || FACILITY_STATUS_REASON_FACILITY_TYPE[r.id] === facility.type);

  const form = useForm({
    mode: 'controlled',
    initialValues: {
      status: facility.status || 'OPEN_ACCEPTING',
      statusReason: facility.statusReason || null,
      statusOther: facility.statusOther || '',
    },
  });

  const { status, statusReason } = form.getValues();
  const needsReason = status !== 'OPEN_ACCEPTING';
  const hasChanged = status !== facility.status;
  const hasReason = !!statusReason;
  const isValid = hasChanged && (!needsReason || hasReason);

  // Clear reason fields when switching back to Open
  useEffect(() => {
    if (status === 'OPEN_ACCEPTING') {
      form.setFieldValue('statusReason', null);
      form.setFieldValue('statusOther', '');
    }
  }, [status]);

  const mutation = useMutation({
    mutationFn: (values) => Api.facilities.updateStatus(facility.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      const label = STATUS_OPTIONS.find(o => o.value === status)?.label;
      const messages = {
        OPEN_ACCEPTING: `${facility.name} is open and accepting new holds.`,
        OPEN_NOT_ACCEPTING: 'New holds are paused.',
        CLOSED: `${facility.name} is temporarily closed.`,
      };
      showToast('Status updated', 'success', 4000, messages[status] || label);
      navigate('/');
    },
    onError: () => {
      showToast("Couldn't update status", 'error', 4000, 'Please try again.');
    },
  });

  return (
    <form onSubmit={form.onSubmit((values) => mutation.mutateAsync(values))}>
      <Stack>
        <Text fw={700}>Status<Text span c='red'> *</Text></Text>
        <Chip.Group
          multiple={false}
          {...form.getInputProps('status')}
        >
          <Stack gap='xs' align='flex-start'>
            {STATUS_OPTIONS.map((opt) => (
              <Chip key={opt.value} value={opt.value}>{opt.label}</Chip>
            ))}
          </Stack>
        </Chip.Group>

        {needsReason && (
          <>
            <Text fw={700}>Reason<Text span c='red'> *</Text></Text>
            <Chip.Group
              multiple={false}
              {...form.getInputProps('statusReason')}
            >
              <Stack gap='xs' align='flex-start'>
                {reasons?.map((reason) => (
                  <Chip key={reason.id} value={reason.id}>{reason.description}</Chip>
                ))}
              </Stack>
            </Chip.Group>

            <Textarea
              label='Announcement (optional)'
              placeholder="e.g., 'Expected to reopen ~3:30 PM'"
              description='Shown in the status banner for all users while this status is active. Keep it short.'
              {...form.getInputProps('statusOther')}
            />

            {STATUS_INFO[status] && (
              <Text size='sm' c='dimmed'>{STATUS_INFO[status]}</Text>
            )}
          </>
        )}

        <Group>
          <Button variant='destructive' onClick={onCancel}>Cancel</Button>
          <Button
            type='submit'
            disabled={!isValid}
            loading={mutation.isPending}
          >
            Confirm new status
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default ChangeStatus;
