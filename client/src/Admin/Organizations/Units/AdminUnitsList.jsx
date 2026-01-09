import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Anchor, Button, Container, Group, Loader, Table, Title, Text, Breadcrumbs, ActionIcon } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { IconTrash } from '@tabler/icons-react';

import Api from '@/Api';
import Pagination from '@/components/Pagination';

function AdminUnitsList () {
  const { organizationId } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const page = parseInt(params.get('page') ?? '1', 10);
  const [lastPage, setLastPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: organization } = useQuery({
    queryKey: ['organizations', organizationId],
    queryFn: async () => {
      const response = await Api.organizations.get(organizationId);
      return response.data;
    }
  });

  const { data: units, isLoading } = useQuery({
    queryKey: ['organizations', organizationId, 'units', page],
    queryFn: async () => {
      const response = await Api.organizations.units.index(organizationId, page);
      setLastPage(Api.calculateLastPage(response, page));
      return response.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Api.organizations.units.delete(organizationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'units'] });
    }
  });

  function handleDelete (unit) {
    modals.openConfirmModal({
      title: 'Delete Unit',
      centered: true,
      children: (
        <Text>
          Are you sure you want to delete <b>{unit.name}</b>? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteMutation.mutate(unit.id),
    });
  }

  const breadcrumbs = [
    { title: 'Admin', href: '/admin' },
    { title: 'Organizations', href: '/admin/organizations' },
    { title: organization?.name || 'Organization', href: `/admin/organizations/${organizationId}` },
    { title: 'Units', href: '#' },
  ].map((item, index) => (
    <Anchor component={Link} to={item.href} key={index}>
      {item.title}
    </Anchor>
  ));

  return (
    <>
      <Head>
        <title>Manage Units - {organization?.name}</title>
      </Head>
      <Container size='xl'>
        <Breadcrumbs mb='md'>{breadcrumbs}</Breadcrumbs>
        <Title mb='md'>Manage Units for {organization?.name || <Loader size='sm' />}</Title>
        <Group mb='lg'>
          <Button component={Link} to='new'>
            Create a new Unit
          </Button>
        </Group>
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
              {!isLoading && units?.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text textAlign='center' py='lg'>No units found.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {!isLoading && units?.map((unit) => (
                <Table.Tr key={unit.id}>
                  <Table.Td>{unit.id}</Table.Td>
                  <Table.Td>{unit.name}</Table.Td>
                  <Table.Td>
                    <Group gap='xs'>
                      <Anchor component={Link} to={`${unit.id}`}>Edit</Anchor>
                      <ActionIcon
                        variant='subtle'
                        color='red'
                        onClick={() => handleDelete(unit)}
                        loading={deleteMutation.isPending && deleteMutation.variables === unit.id}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
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

export default AdminUnitsList;
