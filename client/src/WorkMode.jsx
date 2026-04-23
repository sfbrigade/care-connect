import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Container,
  Loader,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation, useNavigate } from 'react-router';

import Api from './Api';
import { useAuthContext } from './AuthContext';
import { getDefaultPathForUser } from './AppRedirectsConfig';
import { getWorkModeFromPath } from './utils/workMode';
import { useToast } from '@/components/ToastContext';

const MODE_COPY = {
  FIELD: {
    title: 'In the field',
    description: 'In the field means you can create holds and complete arrests.',
    path: '/holds',
    toastTitle: 'Mode changed to "In the field"',
    toastBody: 'You can now create holds and complete arrests',
  },
  CUSTODY: {
    title: 'At RESET',
    description: 'At RESET means you can receive custody and manage facility tasks.',
    path: '/custody',
    toastTitle: 'Mode changed to "At RESET"',
    toastBody: 'You can now receive custody and manage facility tasks',
  },
};

function WorkMode () {
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const fromPath = location.state?.from;
  const currentMode = fromPath ? getWorkModeFromPath(fromPath) : null;
  const initialMode = currentMode === 'FIELD' ? 'CUSTODY' : currentMode === 'CUSTODY' ? 'FIELD' : 'FIELD';

  const [mode, setMode] = useState(initialMode);
  const [unitId, setUnitId] = useState();
  const [unitName, setUnitName] = useState('');
  const [blockerOpen, setBlockerOpen] = useState(false);

  const isDualRole =
    !!user?.roles?.includes('FIELD') && !!user?.roles?.includes('CUSTODY');

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['organizations', user?.organizationId, 'units'],
    queryFn: () => Api.organizations.units.index(user.organizationId, 1, 1000)
      .then((r) => r.data),
    enabled: !!user?.organizationId && isDualRole,
    staleTime: 5 * 60 * 1000,
  });

  const autocompleteData = useMemo(
    () => units.map((u) => ({ value: u.id, label: u.name })),
    [units],
  );

  const canConfirm = unitName.trim().length >= 3 && !!mode;

  function handleOptionSubmit (value) {
    setUnitName(value);
    const normalized = value.trim().toLowerCase();
    const matched = units.find((u) => u.name.trim().toLowerCase() === normalized);
    setUnitId(matched?.id ?? null);
  }

  const mutation = useMutation({
    mutationFn: () => Api.users.update(user.id, {
      unitId,
      unitName: unitName.trim(),
      targetMode: mode,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      showToast(
        MODE_COPY[mode].toastTitle,
        'success',
        4000,
        MODE_COPY[mode].toastBody,
      );
      navigate(MODE_COPY[mode].path);
    },
    onError: (err) => {
      if (err.response?.status === 409 && err.response?.data?.code === 'ACTIVE_FIELD_WORK') {
        setBlockerOpen(true);
      } else {
        console.error(err);
      }
    },
  });

  // Access guard: a user without both roles has no business here. Redirect to
  // their default home rather than rendering an empty screen. Placed after all
  // hooks to respect the rules-of-hooks order.
  if (!isDualRole) {
    return <Navigate to={getDefaultPathForUser(user)} replace />;
  }

  return (
    <Container>
      <Stack gap='xl'>
        <Title order={2}>How are you working today?</Title>

        <Stack gap='xs'>
          <Text fw={500}>Work mode*</Text>
          <SegmentedControl
            value={mode}
            onChange={setMode}
            data={[
              { label: 'In the field', value: 'FIELD' },
              { label: 'At RESET', value: 'CUSTODY' },
            ]}
          />
          <Alert color='blue'>{MODE_COPY[mode].description}</Alert>
        </Stack>

        <Stack gap='xs'>
          <Text fw={500}>What unit are you assigned to today?</Text>
          <Autocomplete
            label='Unit'
            placeholder='Type unit name'
            data={autocompleteData}
            value={unitName}
            onChange={handleOptionSubmit}
            clearable
            disabled={isLoading}
            rightSection={isLoading ? <Loader size='sm' /> : null}
            nothingfound='No units found'
          />
        </Stack>

        <Button
          disabled={!canConfirm}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
          fullWidth
        >
          Confirm
        </Button>
      </Stack>

      <Modal
        opened={blockerOpen}
        onClose={() => setBlockerOpen(false)}
        title='Finish active field work first'
      >
        <Stack gap='md'>
          <Text>You still have active field work. Finish or clear it before switching work modes.</Text>
          <Stack gap='xs' pl='md'>
            <Text>→ Active incidents with holds</Text>
            <Text>→ Active RESET arrival status</Text>
          </Stack>
          <Button onClick={() => { setBlockerOpen(false); navigate('/holds'); }}>
            View active work
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}

export default WorkMode;
