import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Document, Page, pdfjs } from 'react-pdf';
import { ActionIcon, Alert, Button, Container, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconDownload, IconFileTypePdf, IconInfoCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const isReleased = (deflection) => !!deflection?.releasedAt;

export default function Form849BPreview () {
  const { deflectionId } = useParams();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  const { data: deflection, isLoading, error: fetchError } = useQuery({
    queryKey: ['deflections', deflectionId],
    queryFn: () => Api.deflections.get(deflectionId).then(response => response.data),
    enabled: !!deflectionId,
  });

  const subjectName = deflection?.subject
    ? [deflection.subject.firstName, deflection.subject.middleInitial, deflection.subject.lastName].filter(Boolean).join(' ')
    : 'Person X';

  const generatePdf = async () => {
    setPdfLoading(true);
    setPdfError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`/api/forms/849b/pdf/${deflectionId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Failed to generate PDF: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      setPdfUrl(url);
    } catch (err) {
      if (err.name === 'AbortError') {
        setPdfError('PDF generation timed out. Please try again.');
      } else {
        setPdfError(err.message);
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadPdf = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `849B-Certificate-of-Release-${deflectionId}.pdf`;
      link.click();
    }
  };

  const onDocumentLoadSuccess = ({ numPages: n }) => {
    setNumPages(n);
  };

  if (isLoading) {
    return (
      <Container size='md' py='xl'>
        <Group justify='center' py='xl'>
          <Loader />
        </Group>
      </Container>
    );
  }

  if (fetchError) {
    return (
      <Container size='md' py='xl'>
        <Group mb='lg'>
          <ActionIcon variant='subtle' onClick={() => navigate(-1)} size='lg'>
            <IconArrowLeft />
          </ActionIcon>
          <Title order={2}>849B Certificate of Release</Title>
        </Group>
        <Alert color='red' title='Error loading deflection'>
          Could not load deflection #{deflectionId}. It may not exist or you may not have access.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size='lg' py='xl'>
      <Group mb='lg'>
        <ActionIcon variant='subtle' onClick={() => navigate(-1)} size='lg'>
          <IconArrowLeft />
        </ActionIcon>
        <div>
          <Title order={2}>849(b) Certificate of Release</Title>
          <Text c='dimmed' size='sm'>
            Deflection #{deflectionId} — {subjectName}
          </Text>
        </div>
      </Group>

      <Stack gap='md'>
        {!isReleased(deflection) && (
          <Alert icon={<IconInfoCircle size={16} />} color='yellow' title='Subject not yet released'>
            The 849(b) Certificate of Release can only be generated after the subject has been released.
            The current status is: {deflection?.subjectStatus || 'unknown'}.
          </Alert>
        )}

        <Paper shadow='sm' p='md' withBorder>
          <Group justify='space-between' align='center'>
            <Group gap='sm'>
              <IconFileTypePdf size={24} />
              <div>
                <Text fw={500}>Generate Certificate of Release</Text>
                <Text size='sm' c='dimmed'>
                  SF Sheriff&apos;s Dept Form 849(b) for {subjectName}
                </Text>
              </div>
            </Group>
            <Group>
              <Button
                onClick={generatePdf}
                loading={pdfLoading}
                disabled={!isReleased(deflection)}
                leftSection={<IconFileTypePdf size={16} />}
              >
                Generate PDF
              </Button>
              {pdfUrl && (
                <Button
                  variant='outline'
                  onClick={downloadPdf}
                  leftSection={<IconDownload size={16} />}
                >
                  Download
                </Button>
              )}
            </Group>
          </Group>
        </Paper>

        {pdfError && (
          <Alert color='red' title='PDF generation failed'>
            {pdfError}
          </Alert>
        )}

        <Paper shadow='sm' p='md' withBorder>
          {!pdfUrl && !pdfLoading && (
            <Text c='dimmed' ta='center' py='xl'>
              {isReleased(deflection)
                ? 'Click "Generate PDF" to preview the 849(b) form'
                : 'The form will be available once the subject has been released'}
            </Text>
          )}
          {pdfLoading && (
            <Group justify='center' py='xl'>
              <Loader />
              <Text>Generating PDF...</Text>
            </Group>
          )}
          {pdfUrl && !pdfLoading && (
            <div style={{ border: '1px solid #ddd', background: '#f5f5f5', display: 'flex', justifyContent: 'center' }}>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<Loader />}
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={700}
                  />
                ))}
              </Document>
            </div>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
