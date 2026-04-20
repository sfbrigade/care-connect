import { Link } from 'react-router';
import { Button, Group, Loader, Table, Title, Anchor, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminDeflectionDetailCategoriesList () {
  const { data: detailCategories, isLoading } = useQuery({
    queryKey: ['deflection', 'detailCategories', 'index'],
    queryFn: async () => {
      const response = await Api.deflections.detailCategories.index();
      return response.data;
    }
  });
  return (
    <>
      <Head>
        <title>Manage Arrest Cancel Reasons</title>
      </Head>
      <Title mb='md'>Manage </Title>
      <Group mb='lg'>
        <Button component={Link} to='new'>
          Create a new Cancel Reason
        </Button>
      </Group>
      <Table.ScrollContainer>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w='30%'>ID (Slug)</Table.Th>
              <Table.Th w='50%'>Name</Table.Th>
              <Table.Th w='20%'>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading &&
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Group justify='center' py='lg'><Loader /></Group>
                </Table.Td>
              </Table.Tr>}
            {!isLoading && detailCategories?.length === 0 &&
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text textAlign='center' py='lg'>No cancel reasons found.</Text>
                </Table.Td>
              </Table.Tr>}
            {!isLoading && detailCategories?.map((reason) => (
              <Table.Tr key={reason.id}>
                <Table.Td style={reason.deletedById != null ? { textDecoration: 'line-through' } : ''}>{reason.id}</Table.Td>
                <Table.Td style={reason.deletedById != null ? { textDecoration: 'line-through' } : ''}>{reason.name}</Table.Td>
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

export default AdminDeflectionDetailCategoriesList;
