import { useNavigate } from "react-router";
import { Box, Stack, Title, Text, Loader } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Typography, Group } from "@mantine/core";
import { formatTime } from "@/utils/format";
import Api from "@/Api";
import Hold from "./Hold";

function HoldsHistory({ facility, incident }) {
  const navigate = useNavigate();

  const { data: deflections, isFetching: isFetchingDeflections } = useQuery({
    queryKey: ["deflections", facility?.id, "inactive"],
    queryFn: () =>
      Api.deflections
        .list({ facilityId: facility.id, active: false })
        .then((response) => response.data),
    enabled: !!facility,
  });

  const address = `${incident?.addressLine1 ?? ""}${incident?.addressLine2 ? `, ${incident.addressLine2}` : ""}`;

  return (
    <>
      {incident ? (
        <>
          <Box>
            <Group gap="xs">
              <Text size="md">
                Incident {incident ? String(incident.id).padStart(6, "0") : ""}
              </Text>
            </Group>
            <Group gap = "xs">
              {address && (
                <Text c="gray.5" size="md">
                  {address}
                </Text>
              )}
              {address && incident?.arrestedAt && (
                <Text c="gray.5" size="md">
                  •
                </Text>
              )}
              {incident?.arrestedAt && (
                <Text c="gray.5" size="md">
                  {formatTime(incident.arrestedAt)}
                </Text>
              )}
            </Group>
          </Box>
        </>
      ) : (
        ""
      )}
      {isFetchingDeflections && <Loader mx="auto" my="xl" size="lg" />}
      {!isFetchingDeflections && (!deflections || deflections.length === 0) && (
        <>
          <Box bdrs="50%" bg="gray.1" w="160px" h="160px" mx="auto" />
          <Box align="center">
            <Title order={4}>You don't have any past holds</Title>
            <Text size="md" c="dimmed">
              Completed, cancelled, and expired holds will show up here.
            </Text>
          </Box>
        </>
      )}
      {!isFetchingDeflections && deflections && deflections.length > 0 && (
        <>
          <Stack gap="md">
            {deflections
              .filter((x) => {
                return x.subject != null;
              })
              ?.map((deflection) => (
                <Hold
                  key={deflection.id}
                  deflection={deflection}
                  onDetailsClick={() => {
                    navigate(`/holds/${deflection.id}`);
                  }}
                />
              ))}
          </Stack>
        </>
      )}
    </>
  );
}

export default HoldsHistory;
