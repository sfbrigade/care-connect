import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Container, Title, Button, Table, Group, Badge, Loader, Alert } from '@mantine/core';
import { IconPlus, IconAlertCircle } from '@tabler/icons-react';

import Api from '../../../core/Api';

function AdminFacilitiesList () {
  const navigate = useNavigate();

  const { data: facilities, isLoading, error } = useQuery({
    queryKey: ['admin-facilities'],
    queryFn: async () => {
      const response = await Api.admin.facilities.list();
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <Container>
        <Loader />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert icon={<IconAlertCircle />} title='Error' color='red'>
          Failed to load facilities.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Group justify='space-between' mb='md'>
        <Title order={2}>Facilities</Title>
        <Button leftSection={<IconPlus />} onClick={() => navigate('/admin/facilities/new')}>
          New Facility
        </Button>
      </Group>

      {facilities && facilities.length === 0
        ? (
          <Alert>No facilities found.</Alert>
          )
        : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Neighborhood</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {facilities?.map((facility) => (
                <Table.Tr key={facility.id}>
                  <Table.Td>{facility.name}</Table.Td>
                  <Table.Td>{facility.neighborhood || '-'}</Table.Td>
                  <Table.Td>
                    <Badge color={facility.isActive ? 'green' : 'gray'}>
                      {facility.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap='xs'>
                      <Button variant='light' size='xs' onClick={() => navigate(`/admin/facilities/${facility.id}`)}>
                        Edit
                      </Button>
                      <Button variant='light' size='xs' onClick={() => navigate('/lesc/holds', { state: { facilityId: facility.id } })}>
                        Hold
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          )}
    </Container>
  );
}

export default AdminFacilitiesList;
