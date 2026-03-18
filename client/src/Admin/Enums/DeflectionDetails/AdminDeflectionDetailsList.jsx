import { Link } from 'react-router';
import { Button, Group, Loader, Table, Title, Anchor, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

function AdminDeflectionDetailsList () {
    const { data: details, isLoading } = useQuery({
        queryKey: ['deflections','details', 'index'],
        queryFn: async () => {
            const response = await Api.deflections.details.index();
            return response.data
        },
    });
    return (
        <>
            <Head>
                <title>Manage Deflection Details</title>
            </Head>
            <Title mb='md'>Manage Deflection Details</Title>
            <Group mb='lg'>
                <Button component={Link} to='new'>
                    Create a new Deflection Detail
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
                        {isLoading && (
                            <Table.Tr>
                                <Table.Td colSpan={3}>
                                    <Group justify='center' py='lg'><Loader /></Group>
                                </Table.Td>
                            </Table.Tr>
                        )}
                        {!isLoading && details?.length === 0 && (
                            <Table.Tr>
                                <Table.Td colSpan={3}>
                                    <Text textAlign='center' py='lg'>No deflection details found.</Text>
                                </Table.Td>
                            </Table.Tr>
                        )}
                        {!isLoading && details?.map((detail) => (
                            <Table.Tr key={detail.id}>
                                <Table.Td>{detail.id}</Table.Td>
                                <Table.Td>{detail.name}</Table.Td>
                                <Table.Td>
                                    <Anchor component={Link} to={`${detail.id}`}>Edit</Anchor>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>
        </>
    );
}

export default AdminDeflectionDetailsList;