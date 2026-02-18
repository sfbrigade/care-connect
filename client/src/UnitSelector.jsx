import { useState } from 'react';
import { Box, Button, Container, Stack, Title, Autocomplete } from '@mantine/core';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';

import Api from './Api';
import { useAuthContext } from './AuthContext';

function UnitSelector({ title = true, show_btn = true, sendUnitIdToParent}) {
  const { user } = useAuthContext();
  const [unitId, setUnitId] = useState();
  const [unitName, setUnitName] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const from = location.state?.from || '/';

  const { data: units = [] } = useQuery({
    queryKey: ['organizations', user?.organizationId, 'units'],
    queryFn: () => Api.organizations.units.index(user.organizationId).then((response) => response.data),
    enabled: !!user?.organizationId,
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

  function handleOptionSubmit (value) {
    setUnitName(value);
    const selectedUnit = units.find((unit) => unit.name === value);
    if (selectedUnit) {
      setUnitId(selectedUnit.id);
      sendUnitIdToParent(selectedUnit.id)
    }
  }

  function onConfirm () {
    onSubmitMutation.mutate({ unitId });
  }

  return (
    <Stack gap='xl' mah='calc(100vh - var(--app-shell-header-offset) - var(--app-shell-padding) - 1.25rem)'>
      {title && (
        <Title flex='0 0' order={2}>What unit are you assigned to today?</Title>
      )}
      <Autocomplete
        label='Unit'
        placeholder='Start typing a unit name'
        data={autocompleteData}
        value={unitName}
        onChange={handleOptionSubmit}
        clearable
        nothingfound='No units found'
      />
      {show_btn && (
        <Box flex='0 0'>
          <Button disabled={!unitId} fullWidth mt='3rem' onClick={onConfirm}>Confirm unit</Button>
        </Box>
      )}
    </Stack>
  );
}

export default UnitSelector;
