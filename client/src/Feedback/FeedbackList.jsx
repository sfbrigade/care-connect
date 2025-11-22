import { useQuery } from '@tanstack/react-query';
import { Container, Paper, Stack, Table, Text, Pagination, Loader, Center } from '@mantine/core';
import { StatusCodes } from 'http-status-codes';
import { useState } from 'react';

import Api from '../Api';

function FeedbackList () {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['feedback', page],
    queryFn: async () => {
      const response = await Api.feedback.list(page);
      if (response.status === StatusCodes.OK) {
        return response.data;
      }
      throw new Error('Failed to load feedback');
    },
  });

  return (
    <Container size='md' py='xl'>
      <Paper p='xl' radius={12}>
        <Stack gap='md'>
          <Text size='lg' fw={600}>
            All Feedback {data ? `(${data.pagination.total})` : ''}
          </Text>

          {isLoading && (
            <Center>
              <Loader />
            </Center>
          )}

          {isError && (
            <Text c='red'>Failed to load feedback entries.</Text>
          )}

          {data && data.data.length > 0 && (
            <>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Message</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>User Agent</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.data.map((feedback) => (
                    <Table.Tr key={feedback.id}>
                      <Table.Td>
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td style={{ maxWidth: '300px' }}>
                        <Text lineClamp={3}>{feedback.message}</Text>
                      </Table.Td>
                      <Table.Td>{feedback.userEmail || '-'}</Table.Td>
                      <Table.Td style={{ maxWidth: '200px' }}>
                        <Text size='xs' lineClamp={2}>
                          {feedback.userAgent || '-'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {data.pagination.lastPage > 1 && (
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={data.pagination.lastPage}
                  mt='md'
                />
              )}
            </>
          )}

          {data && data.data.length === 0 && (
            <Text c='dimmed' ta='center'>
              No feedback entries yet.
            </Text>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}

export default FeedbackList;
