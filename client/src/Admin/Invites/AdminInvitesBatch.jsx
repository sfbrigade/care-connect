import { useMemo, useState } from 'react';
import { Alert, Button, Container, FileInput, Group, Stack, Table, Text, Title } from '@mantine/core';
import { isEmail } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { Head } from '@unhead/react';

import Api from '@/Api';

const EXPECTED_HEADERS = ['first_name', 'last_name', 'email'];
const emailValidator = isEmail('Please enter a valid email address.');

function parseCsvLine (line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function parseCsv (text) {
  const allLines = text.split(/\r?\n/);
  const errors = [];
  const rows = [];

  const headerLine = allLines.find((line) => line.trim() !== '');
  if (!headerLine) {
    errors.push('CSV file is empty.');
    return { rows, errors };
  }

  const headerValues = parseCsvLine(headerLine).map((value) => value.trim().toLowerCase());
  if (headerValues.length !== EXPECTED_HEADERS.length ||
    headerValues.some((value, index) => value !== EXPECTED_HEADERS[index])) {
    errors.push(`Invalid header row. Expected: ${EXPECTED_HEADERS.join(', ')}.`);
    return { rows, errors };
  }

  let headerSeen = false;
  for (let lineIndex = 0; lineIndex < allLines.length; lineIndex += 1) {
    const rawLine = allLines[lineIndex];
    if (rawLine.trim() === '') {
      continue;
    }
    if (!headerSeen) {
      headerSeen = true;
      continue;
    }
    const lineNumber = lineIndex + 1;
    const values = parseCsvLine(rawLine);
    if (values.length !== EXPECTED_HEADERS.length) {
      errors.push(`Row ${lineNumber}: Expected ${EXPECTED_HEADERS.length} columns.`);
      continue;
    }
    const firstName = values[0].trim();
    const lastName = values[1].trim();
    const email = values[2].trim();
    if (!firstName) {
      errors.push(`Row ${lineNumber}: First name is required.`);
      continue;
    }
    if (!lastName) {
      errors.push(`Row ${lineNumber}: Last name is required.`);
      continue;
    }
    if (!email) {
      errors.push(`Row ${lineNumber}: Email is required.`);
      continue;
    }
    const emailError = emailValidator(email);
    if (emailError) {
      errors.push(`Row ${lineNumber}: ${emailError}`);
      continue;
    }
    rows.push({ firstName, lastName, email });
  }

  return { rows, errors };
}

function AdminInvitesBatch () {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [submitError, setSubmitError] = useState(null);
  const [summary, setSummary] = useState(null);

  const onSubmitMutation = useMutation({
    mutationFn: (payload) => Api.invites.bulk(payload),
    onSuccess: (response) => {
      const result = response.data;
      setSummary(result);
      setRows([]);
      setParseErrors([]);
      setFile(null);
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

  const tableRows = useMemo(() => rows.map((row, index) => (
    <Table.Tr key={`${row.email}-${index}`}>
      <Table.Td>{row.firstName}</Table.Td>
      <Table.Td>{row.lastName}</Table.Td>
      <Table.Td>{row.email}</Table.Td>
      <Table.Td>
        <Button
          variant='subtle'
          color='red'
          size='xs'
          onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
        >
          Remove
        </Button>
      </Table.Td>
    </Table.Tr>
  )), [rows]);

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
      const { rows: parsedRows, errors } = parseCsv(String(text));
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
    setRows([]);
    setParseErrors([]);
    setSubmitError(null);
    setSummary(null);
    setFile(null);
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
            description='File should have a header row with the following columns: first_name, last_name, email'
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
                {tableRows}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      </Container>
    </>
  );
}

export default AdminInvitesBatch;
