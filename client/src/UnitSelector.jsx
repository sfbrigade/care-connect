import { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Container,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';

import Api from './Api';
import { useAuthContext } from './AuthContext';
import { useUserRole } from './hooks/useUserRole';
import { readStoredWorkMode, writeStoredWorkMode } from './utils/workMode';

const MODE_HOME_PATH = { FIELD: '/holds', CUSTODY: '/custody' };
const MODE_DESCRIPTION = {
  FIELD: 'means you can create holds and complete arrests.',
  CUSTODY: 'means you can receive custody and manage facility tasks.',
};
const MODE_SHORT_LABEL = { FIELD: 'In the field', CUSTODY: 'At RESET' };
const MODE_COLOR = { FIELD: 'violet', CUSTODY: 'green' };

function UnitSelector () {
  const { user } = useAuthContext();
  const { isField, isCustody } = useUserRole();
  const [unitId, setUnitId] = useState();
  const [unitName, setUnitName] = useState('');
  const [mode, setMode] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const from = location.state?.from || '/';

  const isDualRole = isField && isCustody;
  // The mode picker is a one-time prompt: if the user has already chosen a
  // mode in a prior login it lives in localStorage and we hide the picker.
  const needsModeSelection = isDualRole && readStoredWorkMode() === null;

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['organizations', user?.organizationId, 'units'],
    queryFn: () => Api.organizations.units.index(user.organizationId, 1, 1000)
      .then((response) => response.data),
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000,
  });

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.users.update(user.id, values),
    onSuccess: async (response) => {
      queryClient.setQueryData(['users', 'me'], (old) => ({ ...(old ?? {}), ...response.data }));
      if (needsModeSelection && mode) {
        writeStoredWorkMode(mode);
        navigate(MODE_HOME_PATH[mode]);
        return;
      }
      // Dual-role users with a remembered mode should always land on that
      // mode's home after confirming their unit, regardless of the `from`
      // location carried through from the redirect.
      const stored = isDualRole ? readStoredWorkMode() : null;
      if (stored) {
        navigate(MODE_HOME_PATH[stored]);
        return;
      }
      navigate(from);
    },
    onError: (errors) => console.error(errors),
  });

  const autocompleteData = units.map((unit) => ({
    value: unit.id,
    label: unit.name,
  }));
  const hasUnit = unitName.trim().length >= 3;
  const canConfirm = hasUnit && (!needsModeSelection || !!mode);

  function handleOptionSubmit (value) {
    setUnitName(value);
    const normalizedValue = value.trim().toLowerCase();
    const selectedUnit = units.find((unit) => unit.name.trim().toLowerCase() === normalizedValue);
    setUnitId(selectedUnit?.id ?? null);
  }

  function onConfirm () {
    onSubmitMutation.mutate({
      unitId,
      unitName: unitName.trim(),
    });
  }

  return (
    <Container>
      <Stack gap='xl' mah='calc(100vh - var(--app-shell-header-offset) - var(--app-shell-padding) - 1.25rem)'>
        {needsModeSelection
          ? (
            <>
              <Stack gap='xs' flex='0 0'>
                <Title order={2}>How are you working today?</Title>
                <Text size='sm' c='dimmed'>You&apos;ll only see this once. You can change it later from the menu.</Text>
              </Stack>
              <Stack gap='xs'>
                <Text fw={500}>Work mode<Text span c='red'>*</Text></Text>
                <SegmentedControl
                  value={mode ?? ''}
                  onChange={setMode}
                  color={mode ? MODE_COLOR[mode] : undefined}
                  data={[
                    { label: 'In the field', value: 'FIELD' },
                    { label: 'At RESET', value: 'CUSTODY' },
                  ]}
                />
                {mode && (
                  <Alert
                    color='gray'
                    icon={<IconInfoCircle color='var(--mantine-color-blue-6)' />}
                  >
                    <Text span fw={700}>{MODE_SHORT_LABEL[mode]}</Text>
                    {' '}
                    {MODE_DESCRIPTION[mode]}
                  </Alert>
                )}
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
                  nothingFoundMessage='No units found'
                />
              </Stack>
            </>
            )
          : (
            <>
              <Title flex='0 0' order={2}>What unit are you assigned to today?</Title>
              <Stack gap='xs'>
                <Text size='sm' c='dimmed'>If your unit number does not appear in list, just type and confirm</Text>
                <Autocomplete
                  label='Unit'
                  placeholder='Type unit name'
                  data={autocompleteData}
                  value={unitName}
                  onChange={handleOptionSubmit}
                  clearable
                  disabled={isLoading}
                  rightSection={isLoading ? <Loader size='sm' /> : null}
                  nothingFoundMessage='No units found'
                />
              </Stack>
            </>
            )}
        <Box flex='0 0'>
          <Button disabled={!canConfirm} loading={onSubmitMutation.isPending} fullWidth mt='3rem' onClick={onConfirm}>Confirm</Button>
        </Box>
      </Stack>
    </Container>
  );
}

export default UnitSelector;
