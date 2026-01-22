import { Link } from 'react-router';
import { Button, Group, Loader, Table, Title, Anchor, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminFacilityStatusReasonsList () {
  const { data: statusReasons, isLoading } = useQuery({
    queryKey: ['facility-status-reasons'],
    queryFn: async () => {
      const response = await Api.facilities.statusReasons.index();
      return response.data;
    }
  });

  return (
    <>
      <Head>
        <title>Manage Facility Status Reasons</title>
      </Head>
      <Title mb='md'>Manage Facility Status Reasons</Title>
      <Group mb='lg'>
        <Button component={Link} to='new'>
          Create a new Status Reason
        </Button>
      </Group>
      <Table.ScrollContainer>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w='20%'>ID (Slug)</Table.Th>
              <Table.Th w='20%'>Type</Table.Th>
              <Table.Th w='40%'>Description</Table.Th>
              <Table.Th w='20%'>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading &&
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Group justify='center' py='lg'><Loader /></Group>
                </Table.Td>
              </Table.Tr>}
            {!isLoading && statusReasons?.length === 0 &&
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text textAlign='center' py='lg'>No status reasons found.</Text>
                </Table.Td>
              </Table.Tr>}
            {!isLoading && statusReasons?.map((reason) => (
              <Table.Tr key={reason.id}>
                <Table.Td>{reason.id}</Table.Td>
                <Table.Td>{reason.type || 'All'}</Table.Td>
                <Table.Td>{reason.description}</Table.Td>
                <Table.Td>
                  <Anchor component={Link} to={`${reason.id}`}>Edit</Anchor>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
}

export default AdminFacilityStatusReasonsList;
