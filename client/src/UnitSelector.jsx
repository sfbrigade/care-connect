import { useState } from "react";
import { Box, Button, Container, Stack, Title } from "@mantine/core";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import Select from "./components/Select";

import Api from "./Api";
import { useAuthContext } from "./AuthContext";

function UnitSelector() {
  const { user } = useAuthContext();
  const [unitName, setUnitName] = useState();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const from = location.state?.from || "/";

  const { data: units } = useQuery({
    queryKey: ["organizations", user?.organizationId, "units"],
    queryFn: () =>
      Api.organizations.units
        .index(user.organizationId)
        .then((response) => response.data),
    enabled: !!user?.organizationId,
  });

  const onSubmitMutation = useMutation({
    mutationFn: (values) => Api.users.update(user.id, values),
    onSuccess: async (response) => {
      queryClient.setQueryData(["users", "me"], response.data);
      navigate(from);
    },
    onError: (errors) => console.error(errors),
  });

  function onConfirm() {
    const translatedID = units.find((unit) => unit.name === unitName).id;
    onSubmitMutation.mutate({ unitId: translatedID });
  }

  return (
    <Container>
      <Stack
        gap="xl"
        mah="calc(100vh - var(--app-shell-header-offset) - var(--app-shell-padding) - 1.25rem)"
      >
        <Title flex="0 0" order={2}>
          What unit are you assigned to today?
        </Title>
        <Box mih="0" flex="0 2">
          <Stack gap="md">
            <Select
              label="Select Unit"
              placeholder="Select a unit"
              data={units?.map((unit) => unit.name)}
              value={unitName}
              onChange={(e) => {
                setUnitName(e);
              }}
              radius="md"
              size="lg"
            />
          </Stack>
        </Box>
        <Box flex="0 0">
          <Button disabled={!unitName} fullWidth mt="3rem" onClick={onConfirm}>
            Confirm unit
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}

export default UnitSelector;
