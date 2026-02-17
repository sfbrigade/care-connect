import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Container, Title, Paper, TextInput, Textarea, Button, Group, Stack, Loader, Text } from '@mantine/core';
import { useForm } from '@mantine/form';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function TestFormPreview () {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const form = useForm({
    initialValues: {
      subjectFirstName: 'John',
      subjectLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      caseNumber: '2026-TEST-001',
      officerName: 'Officer Smith',
      badgeNumber: '12345',
      incidentLocation: '123 Main Street, San Francisco, CA',
      notes: 'This is a test form generated using @react-pdf/renderer.',
    },
  });

  const generatePdf = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    Object.entries(form.values).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    try {
      const response = await fetch(`/api/forms/test/pdf?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to generate PDF: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      setPdfUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'test-form.pdf';
      link.click();
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  return (
    <Container size='xl' py='xl'>
      <Title order={1} mb='lg'>PDF Form Test</Title>
      <Text c='dimmed' mb='xl'>
        This page demonstrates server-side PDF generation using @react-pdf/renderer.
        Fill in the form fields and click "Generate PDF" to see the result.
      </Text>

      <Group align='flex-start' gap='xl'>
        <Paper shadow='sm' p='md' withBorder style={{ flex: 1, minWidth: 300 }}>
          <Title order={3} mb='md'>Form Data</Title>
          <Stack gap='sm'>
            <TextInput
              label='First Name'
              {...form.getInputProps('subjectFirstName')}
            />
            <TextInput
              label='Last Name'
              {...form.getInputProps('subjectLastName')}
            />
            <TextInput
              label='Date of Birth'
              {...form.getInputProps('dateOfBirth')}
            />
            <TextInput
              label='Case Number'
              {...form.getInputProps('caseNumber')}
            />
            <TextInput
              label='Officer Name'
              {...form.getInputProps('officerName')}
            />
            <TextInput
              label='Badge Number'
              {...form.getInputProps('badgeNumber')}
            />
            <TextInput
              label='Incident Location'
              {...form.getInputProps('incidentLocation')}
            />
            <Textarea
              label='Notes'
              rows={3}
              {...form.getInputProps('notes')}
            />
            <Group>
              <Button onClick={generatePdf} loading={loading}>
                Generate PDF
              </Button>
              {pdfUrl && (
                <Button variant='outline' onClick={downloadPdf}>
                  Download PDF
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>

        <Paper shadow='sm' p='md' withBorder style={{ flex: 2, minWidth: 400 }}>
          <Title order={3} mb='md'>PDF Preview</Title>
          {error && (
            <Text c='red' mb='md'>{error}</Text>
          )}
          {loading && (
            <Group justify='center' py='xl'>
              <Loader />
              <Text>Generating PDF...</Text>
            </Group>
          )}
          {!pdfUrl && !loading && (
            <Text c='dimmed' ta='center' py='xl'>
              Click "Generate PDF" to preview the form
            </Text>
          )}
          {pdfUrl && !loading && (
            <div style={{ border: '1px solid #ddd', background: '#f5f5f5' }}>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<Loader />}
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={550}
                  />
                ))}
              </Document>
            </div>
          )}
        </Paper>
      </Group>
    </Container>
  );
}
