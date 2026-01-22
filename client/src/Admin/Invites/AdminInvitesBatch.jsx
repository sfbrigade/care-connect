import { useState } from 'react';
import { Alert, Button, Container, FileInput, Group, Stack, Table, Text, Title } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

import { parseCsv } from './util';

const EXPECTED_HEADERS = ['first_name', 'last_name', 'email'];

function InviteRow ({ row, index, onRemove }) {
  return (
    <Table.Tr>
      <Table.Td>{row.firstName}</Table.Td>
      <Table.Td>{row.lastName}</Table.Td>
      <Table.Td>{row.email}</Table.Td>
      <Table.Td>
        <Button
          variant='subtle'
          color='red'
          size='xs'
          onClick={() => onRemove(index)}
        >
          Remove
        </Button>
      </Table.Td>
    </Table.Tr>
  );
}

function AdminInvitesBatch () {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [submitError, setSubmitError] = useState(null);
  const [summary, setSummary] = useState(null);

  function resetForm () {
    setRows([]);
    setParseErrors([]);
    setFile(null);
  }

  const onSubmitMutation = useMutation({
    mutationFn: (payload) => Api.invites.bulk(payload),
    onSuccess: (response) => {
      const result = response.data;
      setSummary(result);
      resetForm();
      if (result.errorCount > 0) {
        setSubmitError('Some invites could not be processed. See details below.');
      } else {
        setSubmitError(null);
      }
    },
    onError: (errors) => {
      setSubmitError(errors?._form ?? 'Failed to submit batch invites.');
    },
  });

  const canSubmit = rows.length > 0 && !onSubmitMutation.isPending;

  function handleFile (file) {
    setSummary(null);
    setSubmitError(null);
    setFile(file ?? null);
    if (!file) {
      setRows([]);
      setParseErrors([]);
      return;
    }
    const reader = new window.FileReader();
    reader.onload = (event) => {
      const text = event.target?.result ?? '';
      const { rows: parsedRows, errors } = parseCsv(String(text), EXPECTED_HEADERS);
      setRows(parsedRows);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  }

  function handleSubmit () {
    setSubmitError(null);
    setSummary(null);
    onSubmitMutation.mutate({ invites: rows });
  }

  function handleReset () {
    setSubmitError(null);
    setSummary(null);
    resetForm();
  }

  return (
    <>
      <Head>
        <title>Batch Invite Users</title>
      </Head>
      <Container size='xl'>
        <Title mb='md'>Batch Invite Users</Title>
        <Stack>
          {submitError && <Alert color='red'>{submitError}</Alert>}
          {summary && (
            <Alert color={summary.errorCount > 0 ? 'yellow' : 'green'} title='Batch invite summary'>
              <Text>Invited: {summary.invitedCount}</Text>
              <Text>Already existed: {summary.existingCount}</Text>
              <Text>Errors: {summary.errorCount}</Text>
              {summary.errors?.length > 0 && (
                <Stack gap={4} mt='sm'>
                  {summary.errors.map((error, index) => (
                    <Text key={`${error.email}-${index}`} c='red' size='sm'>
                      {error.email}: {error.message}
                    </Text>
                  ))}
                </Stack>
              )}
            </Alert>
          )}
          <FileInput
            label='Upload CSV'
            description='File must have the following columns: first_name, last_name, email'
            placeholder='Select a CSV file'
            accept='.csv,text/csv'
            maw={420}
            value={file}
            onChange={handleFile}
            disabled={onSubmitMutation.isPending}
          />
          {parseErrors.length > 0 && (
            <Alert color='red' title='CSV validation errors'>
              <Stack gap={4}>
                {parseErrors.map((error, index) => (
                  <Text key={`${error}-${index}`} size='sm'>{error}</Text>
                ))}
              </Stack>
            </Alert>
          )}
          <Group justify='space-between'>
            <Text size='sm'>Rows ready to invite: {rows.length}</Text>
            <Group>
              <Button variant='default' onClick={handleReset} disabled={onSubmitMutation.isPending}>
                Reset
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                Submit
              </Button>
            </Group>
          </Group>
          <Table.ScrollContainer>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>First name</Table.Th>
                  <Table.Th>Last name</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text c='dimmed' size='sm'>Upload a CSV to preview invites.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {rows.map((row, index) => (
                  <InviteRow
                    key={`${row.email}-${index}`}
                    row={row}
                    index={index}
                    onRemove={(targetIndex) => {
                      setRows((current) => current.filter((_, i) => i !== targetIndex));
                    }}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      </Container>
    </>
  );
}

export default AdminInvitesBatch;
