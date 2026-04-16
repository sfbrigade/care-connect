import { useState } from 'react';
import { Box, Button, Container, Stack, Title, Autocomplete, Loader, Text } from '@mantine/core';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';

import Api from './Api';
import { useAuthContext } from './AuthContext';

function UnitSelector () {
  const { user } = useAuthContext();
  const [unitId, setUnitId] = useState();
  const [unitName, setUnitName] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const from = location.state?.from || '/';

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['organizations', user?.organizationId, 'units'],
    queryFn: () => Api.organizations.units.index(user.organizationId, 1, 1000)
      .then((response) => response.data),
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes - prevent unnecessary refetches
  });

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.users.update(user.id, values),
    onSuccess: async (response) => {
      queryClient.setQueryData(['users', 'me'], response.data);
      navigate(from);
    },
    onError: (errors) => console.error(errors),
  });

  const autocompleteData = units.map((unit) => ({
    value: unit.id,
    label: unit.name,
  }));
  const canConfirm = unitName.trim().length >= 3;

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
            nothingfound='No units found'
          />
        </Stack>
        <Box flex='0 0'>
          <Button disabled={!canConfirm} loading={onSubmitMutation.isPending} fullWidth mt='3rem' onClick={onConfirm}>Confirm unit</Button>
        </Box>
      </Stack>
    </Container>
  );
}

export default UnitSelector;
