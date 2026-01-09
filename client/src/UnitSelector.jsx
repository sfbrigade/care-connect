import { useState } from 'react';
import { Box, Button, Chip, Container, Stack, Title } from '@mantine/core';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';

import Api from './Api';
import { useAuthContext } from './AuthContext';

function UnitSelector () {
  const { user } = useAuthContext();
  const [unitId, setUnitId] = useState();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const from = location.state?.from || '/';

  const { data: units } = useQuery({
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

  function onConfirm () {
    onSubmitMutation.mutate({ unitId });
  }

  return (
    <Container>
      <Stack gap='xl' mah='calc(100vh - var(--app-shell-header-offset) - var(--app-shell-padding) - 1.25rem)'>
        <Title flex='0 0' order={2}>What unit are you assigned to today?</Title>
        <Chip.Group value={unitId} onChange={setUnitId}>
          <Box mih='0' flex='0 2' style={{ overflowY: 'scroll' }}>
            <Stack gap='md'>
              {units?.map((unit) => (
                <Chip
                  key={unit.id}
                  color='gray.6'
                  size='xl'
                  value={unit.id}
                >
                  {unit.name}
                </Chip>
              ))}
            </Stack>
          </Box>
        </Chip.Group>
        <Box flex='0 0'>
          <Button disabled={!unitId} fullWidth mt='3rem' onClick={onConfirm}>Confirm unit</Button>
        </Box>
      </Stack>
    </Container>
  );
}

export default UnitSelector;
