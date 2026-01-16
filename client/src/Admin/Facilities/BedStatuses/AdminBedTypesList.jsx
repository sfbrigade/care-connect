import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button, Container, Group, Loader, Table, Title, Text, Breadcrumbs, Anchor } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';
import { DateTime } from 'luxon';

import Api from '@/Api';
import Pagination from '@/components/Pagination';

function AdminBedTypesList () {
  const { facilityId } = useParams();
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const { data: facility, isLoading: isLoadingFacility } = useQuery({
    queryKey: ['facility', facilityId],
    queryFn: async () => {
      const response = await Api.facilities.get(facilityId);
      return response.data;
    }
  });

  const { data: bedTypes, isLoading: isLoadingBedTypes } = useQuery({
    queryKey: ['bedTypes', facilityId, page],
    queryFn: async () => {
      const response = await Api.facilities.bedTypes.index(facilityId, page);
      setLastPage(Api.calculateLastPage(response, page));
      return response.data;
    }
  });

  const isLoading = isLoadingFacility || isLoadingBedTypes;

  const breadcrumbs = [
    { title: 'Home', href: '/' },
    { title: 'Manage Facilities', href: '/admin/facilities' },
    { title: facility?.name || 'Facility', href: `/admin/facilities/${facilityId}` },
    { title: 'Bed Types', href: '#' },
  ].map((item, index) => (
    <Anchor component={Link} to={item.href} key={index}>
      {item.title}
    </Anchor>
  ));

  return (
    <>
      <Head>
        <title>Manage Bed Types - {facility?.name}</title>
      </Head>
      <Container size='xl'>
        <Breadcrumbs mb='md' separator='→'>
          {breadcrumbs}
        </Breadcrumbs>

        <Group justify='space-between' mb='lg'>
          <Title order={2}>Bed Types for {facility?.name}</Title>
          <Button component={Link} to='new'>
            Create New Bed Type
          </Button>
        </Group>

        <Table.ScrollContainer>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Created At</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Capacity</Table.Th>
                <Table.Th>Occupied</Table.Th>
                <Table.Th>Holds</Table.Th>
                <Table.Th>Unavailable Unoccupied</Table.Th>
                <Table.Th>Unavailable Occupied</Table.Th>
                <Table.Th>Available</Table.Th>
                <Table.Th>Created By</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading && (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Group justify='center' py='lg'><Loader /></Group>
                  </Table.Td>
                </Table.Tr>
              )}
              {!isLoading && bedTypes?.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text ta='center' py='sm'>No bed types found.</Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {!isLoading && bedTypes?.map((type) => (
                <Table.Tr key={type.id}>
                  <Table.Td>{DateTime.fromISO(type.createdAt).toFormat('yyyy-MM-dd HH:mm')}</Table.Td>
                  <Table.Td>
                    <Anchor component={Link} to={type.id}>
                      {type.type}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>{type.capacity}</Table.Td>
                  <Table.Td>{type.occupied}</Table.Td>
                  <Table.Td>{type.holds}</Table.Td>
                  <Table.Td>{type.unavailableUnoccupied}</Table.Td>
                  <Table.Td>{type.unavailableOccupied}</Table.Td>
                  <Table.Td>{type.available}</Table.Td>
                  <Table.Td>{type.createdBy?.firstName} {type.createdBy?.lastName}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
        </Table.ScrollContainer>
      </Container>
    </>
  );
}

export default AdminBedTypesList;
