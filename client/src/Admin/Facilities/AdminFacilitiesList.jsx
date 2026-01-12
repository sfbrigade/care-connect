import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Button, Container, Group, Loader, Table, Title, Anchor } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import i18n from 'i18next';

import Api from '@/Api';
import Pagination from '@/components/Pagination';

function AdminFacilitiesList () {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const page = parseInt(params.get('page') ?? '1', 10);
  const [lastPage, setLastPage] = useState(1);

  const { data: facilities, isLoading } = useQuery({
    queryKey: ['facilities', page],
    queryFn: async () => {
      const response = await Api.facilities.index(page, 'statusReason');
      setLastPage(Api.calculateLastPage(response, page));
      return response.data;
    }
  });

  const formatStatus = (facility) => {
    const statusLabel = i18n.t(`facility.status.${facility.status}`);
    const reason = facility.statusReason?.description || facility.statusOther;

    if (reason) {
      return `${statusLabel} (${reason})`;
    }

    return statusLabel;
  };

  return (
    <>
      <Head>
        <title>Manage Facilities</title>
      </Head>
      <Container size='xl'>
        <Title mb='md'>Manage Facilities</Title>
        <Group mb='lg'>
          <Button component={Link} to='new'>
            Create a new Facility
          </Button>
        </Group>
        <Title order={2}>Facilities</Title>
        <Table.ScrollContainer>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w='35%'>Name</Table.Th>
                <Table.Th w='35%'>Status</Table.Th>
                <Table.Th w='30%'>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Group justify='center' py='lg'><Loader /></Group>
                  </Table.Td>
                </Table.Tr>}
              {!isLoading && facilities?.map((facility) => (
                <Table.Tr key={facility.id}>
                  <Table.Td>{facility.name}</Table.Td>
                  <Table.Td>{formatStatus(facility)}</Table.Td>
                  <Table.Td>
                    <Anchor component={Link} to={`${facility.id}`}>Edit</Anchor>
                    &nbsp;|&nbsp;
                    <Anchor component={Link} to={`${facility.id}/status`}>Update Status</Anchor>
                    &nbsp;|&nbsp;
                    <Anchor component={Link} to={`${facility.id}/bed-statuses`}>Update Beds</Anchor>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Pagination page={page} lastPage={lastPage} />
        </Table.ScrollContainer>
      </Container>
    </>
  );
}

export default AdminFacilitiesList;
