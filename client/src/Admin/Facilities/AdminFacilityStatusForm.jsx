import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Alert, Button, Container, Fieldset, Select, Stack, TextInput, Textarea, Title } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';

import Api from '@/Api';

const FACILITY_STATUS_REASON_FACILITY_TYPE = {
  SFSO_STAFFING: 'LESC',
  CONNECTIONS_STAFFING: 'LESC',
};

function AdminFacilityStatusForm () {
  const { facilityId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [success, setSuccess] = useState(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      status: '',
      statusReason: '',
      statusOther: '',
      updateNotes: '',
    },
    validate: {
      status: isNotEmpty('Status is required.'),
      statusReason: (value, values) => {
        if (values.status !== 'OPEN_ACCEPTING' && !value) {
          return 'Status reason is required when not Open & Accepting.';
        }
        return null;
      },
    },
  });

  const { data: facility, isLoading: facilityLoading } = useQuery({
    queryKey: ['facilities', facilityId],
    queryFn: () => Api.facilities.get(facilityId).then(res => res.data),
    enabled: !!facilityId,
  });

  const allReasons = Object.entries(t('facilityStatusReason', { returnObjects: true }))
    .map(([id, description]) => ({ id, description }));
  const reasons = facility
    ? allReasons.filter(r => !FACILITY_STATUS_REASON_FACILITY_TYPE[r.id] || FACILITY_STATUS_REASON_FACILITY_TYPE[r.id] === facility.type)
    : allReasons;

  useEffect(() => {
    if (facility) {
      form.initialize({
        status: facility.status,
        statusReason: facility.statusReason || '',
        statusOther: facility.statusOther || '',
        updateNotes: '', // Reset notes for new update
      });
    }
  }, [facility]);

  const updateStatusMutation = useMutation({
    mutationFn: (values) => Api.facilities.updateStatus(facilityId, values),
    onMutate: () => setSuccess(false),
    onSuccess: () => {
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (errors) => form.setErrors(errors),
  });

  function handleCancel () {
    navigate(-1);
  }

  return (
    <>
      <Head>
        <title>Update Facility Status - {facility?.name || '...'}</title>
      </Head>
      <Container size='sm'>
        <Title mb='md'>Update Status</Title>
        <Title order={3} mb='lg'>{facility?.name}</Title>

        <form onSubmit={form.onSubmit((values) => updateStatusMutation.mutateAsync(values))}>
          <Fieldset disabled={facilityLoading || updateStatusMutation.isPending} variant='unstyled'>
            <Stack>
              {form.errors?._form && <Alert color='red'>{form.errors._form}</Alert>}
              {success && <Alert color='green'>Facility status has been updated!</Alert>}

              <Select
                {...form.getInputProps('status')}
                key={form.key('status')}
                label='Status'
                placeholder='Select status'
                data={['OPEN_ACCEPTING', 'OPEN_NOT_ACCEPTING', 'CLOSED'].map(status => ({
                  value: status,
                  label: i18n.t(`facility.status.${status}`)
                }))}
                required
              />

              {form.getValues().status !== 'OPEN_ACCEPTING' && form.getValues().status && (
                <Stack>
                  <Select
                    {...form.getInputProps('statusReason')}
                    key={form.key('statusReason')}
                    label='Reason'
                    placeholder='Select reason'
                    data={reasons.map(r => ({ value: r.id, label: r.description }))}
                    required
                  />

                  {form.getValues().statusReason === 'OTHER' && (
                    <TextInput
                      {...form.getInputProps('statusOther')}
                      key={form.key('statusOther')}
                      label='Other Reason Details'
                      placeholder='Please specify...'
                    />
                  )}
                </Stack>
              )}

              <Textarea
                {...form.getInputProps('updateNotes')}
                key={form.key('updateNotes')}
                label='Internal Update Notes'
                placeholder='Add any internal notes about this status change...'
                rows={3}
              />

              <Stack mt='md'>
                <Button
                  loading={updateStatusMutation.isPending}
                  type='submit'
                  fullWidth
                >
                  Update Status
                </Button>
                <Button
                  variant='subtle'
                  onClick={handleCancel}
                  disabled={updateStatusMutation.isPending}
                  fullWidth
                >
                  Back to Facilities
                </Button>
              </Stack>
            </Stack>
          </Fieldset>
        </form>
      </Container>
    </>
  );
}

export default AdminFacilityStatusForm;
