import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ActionIcon, Alert, Button, Container, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconDownload, IconFileTypePdf, IconInfoCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import FORM_REGISTRY from './formRegistry';

const isReleased = (deflection) => !!deflection?.releasedAt;

function getSubjectName (deflection) {
  if (!deflection?.subject) return 'Person X';
  return [deflection.subject.firstName, deflection.subject.middleInitial, deflection.subject.lastName].filter(Boolean).join(' ');
}

export default function FormPage () {
  const { formId, deflectionId } = useParams();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  const formInfo = FORM_REGISTRY[formId];

  const { data: deflection, isLoading, error: fetchError } = useQuery({
    queryKey: ['deflections', deflectionId],
    queryFn: () => Api.deflections.get(deflectionId).then(response => response.data),
    enabled: !!deflectionId,
  });

  const subjectName = getSubjectName(deflection);

  const generatePdf = async () => {
    setPdfLoading(true);
    setPdfError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`/api/forms/${formId}/pdf/${deflectionId}`, {
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

      setPdfUrl(`${url}#navpanes=0&zoom=FitH`);
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
      link.download = formInfo.downloadFilename(deflectionId);
      link.click();
    }
  };

  if (!formInfo) {
    return (
      <Alert color='red' title='Unknown form' m='md'>
        No form found for ID &quot;{formId}&quot;.
      </Alert>
    );
  }

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
          <Title order={2}>{formInfo.title}</Title>
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
        <ActionIcon variant='subtle' onClick={() => navigate(-1)} size='lg' aria-label='Go back'>
          <IconArrowLeft />
        </ActionIcon>
        <div>
          <Title order={2}>{formInfo.title}</Title>
          <Text c='dimmed' size='sm'>
            Deflection #{deflectionId} — {subjectName}
          </Text>
        </div>
      </Group>

      <Stack gap='md'>
        {!isReleased(deflection) && (
          <Alert icon={<IconInfoCircle size={16} />} color='yellow' title='Subject not yet released'>
            The {formInfo.title} can only be generated after the subject has been released.
            The current status is: {deflection?.subjectStatus || 'unknown'}.
          </Alert>
        )}

        <Paper shadow='sm' p='md' withBorder>
          <Group justify='space-between' align='center'>
            <Group gap='sm'>
              <IconFileTypePdf size={24} />
              <Text fw={500}>{formInfo.description(subjectName)}</Text>
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
                ? 'Click "Generate PDF" to preview the form'
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
            <iframe
              src={pdfUrl}
              title={formInfo.title}
              style={{ width: '100%', height: '800px', border: 'none', display: 'block' }}
            />
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
