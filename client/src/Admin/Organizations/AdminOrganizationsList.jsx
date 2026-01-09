import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Button, Container, Group, Loader, Table, Title, Anchor } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';
import Pagination from '@/components/Pagination';

function AdminOrganizationsList () {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const page = parseInt(params.get('page') ?? '1', 10);
  const [lastPage, setLastPage] = useState(1);

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations', page],
    queryFn: async () => {
      const response = await Api.organizations.index(page);
      setLastPage(Api.calculateLastPage(response, page));
      return response.data;
    }
  });

  return (
    <>
      <Head>
        <title>Manage Organizations</title>
      </Head>
      <Container size='xl'>
        <Title mb='md'>Manage Organizations</Title>
        <Group mb='lg'>
          <Button component={Link} to='new'>
            Create a new Organization
          </Button>
        </Group>
        <Title order={2}>Organizations</Title>
        <Table.ScrollContainer>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w='30%'>ID</Table.Th>
                <Table.Th w='40%'>Name</Table.Th>
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
              {!isLoading && organizations?.map((org) => (
                <Table.Tr key={org.id}>
                  <Table.Td>{org.id}</Table.Td>
                  <Table.Td>{org.name}</Table.Td>
                  <Table.Td>
                    <Anchor component={Link} to={`${org.id}`}>Edit</Anchor>
                    &nbsp;|&nbsp;
                    <Anchor component={Link} to={`${org.id}/units`}>Manage Units</Anchor>
                    &nbsp;|&nbsp;
                    <Anchor component={Link} to={`${org.id}/titles`}>Manage Titles</Anchor>
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

export default AdminOrganizationsList;
