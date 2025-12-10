import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Anchor, Button, Container, Group, Loader, Table, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';
import Pagination from '@/components/Pagination';

function AdminUsersList () {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const page = parseInt(params.get('page') ?? '1', 10);
  const [lastPage, setLastPage] = useState(1);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: async () => {
      const response = await Api.users.index(page);
      setLastPage(Api.calculateLastPage(response, page));
      return response.data;
    }
  });

  return (
    <>
      <Head>
        <title>Manage Users</title>
      </Head>
      <Container>
        <Title mb='md'>Manage Users</Title>
        <Group mb='lg'>
          <Button component={Link} to='/admin/invites/new'>
            Invite a new User
          </Button>
        </Group>
        <Title order={2}>Users</Title>
        <Table.ScrollContainer>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w='15%'>First name</Table.Th>
                <Table.Th w='15%'>Last name</Table.Th>
                <Table.Th w='20%'>Email</Table.Th>
                <Table.Th w='20%'>Admin?</Table.Th>
                <Table.Th w='30%'>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                <Table.Td colSpan={5}>
                  <Group justify='center' py='lg'><Loader /></Group>
                </Table.Td>}
              {!isLoading && users?.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>{user.firstName}</Table.Td>
                  <Table.Td>{user.lastName}</Table.Td>
                  <Table.Td>
                    <Anchor href={`mailto:${user.email}`}>{user.email}</Anchor>
                  </Table.Td>
                  <Table.Td>{user.isAdmin && 'Admin'}</Table.Td>
                  <Table.Td>
                    <Anchor component={Link} to={`${user.id}`}>Edit&nbsp;Profile</Anchor>
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
export default AdminUsersList;
