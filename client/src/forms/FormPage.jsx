import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ActionIcon, Alert, Box, Container, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import Api from '@/Api';
import FORM_REGISTRY from './formRegistry';

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
  const generationCheck = formInfo && deflection ? formInfo.canGenerate(deflection) : false;
  const canGeneratePdf = generationCheck === true;
  const generationBlockedMessage = generationCheck?.message || 'This form is not available for the current record status.';

  useEffect(() => {
    if (!canGeneratePdf || !formId || !deflectionId) return undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let blobUrl = null;
    let isCurrent = true;

    async function loadPdf () {
      setPdfLoading(true);
      setPdfError(null);
      setPdfUrl(null);

      try {
        const response = await fetch(`/api/forms/${formId}/pdf/${deflectionId}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || `Failed to load PDF: ${response.statusText}`);
        }
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);

        if (isCurrent) {
          setPdfUrl(`${blobUrl}#navpanes=0&zoom=FitH`);
        }
      } catch (err) {
        if (!isCurrent) return;

        if (err.name === 'AbortError') {
          setPdfError('PDF loading timed out. Please try again.');
        } else {
          setPdfError(err.message);
        }
      } finally {
        if (isCurrent) {
          setPdfLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCurrent = false;
      clearTimeout(timeoutId);
      controller.abort();
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [canGeneratePdf, deflectionId, formId]);

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
        {!canGeneratePdf && (
          <Alert icon={<IconInfoCircle size={16} />} color='yellow' title='Document not available'>
            {generationBlockedMessage}
            {' '}The current status is: {deflection?.subjectStatus || 'unknown'}.
          </Alert>
        )}

        {pdfError && (
          <Alert color='red' title='PDF preview failed'>
            {pdfError}
          </Alert>
        )}

        <Paper shadow='sm' p='md' withBorder>
          {!pdfUrl && !pdfLoading && (
            <Text c='dimmed' ta='center' py='xl'>
              {canGeneratePdf
                ? 'Loading PDF preview...'
                : 'The form is not available for this record yet'}
            </Text>
          )}
          {pdfLoading && (
            <Group justify='center' py='xl'>
              <Loader />
              <Text>Loading PDF...</Text>
            </Group>
          )}
          {pdfUrl && !pdfLoading && (
            <Box
              component='iframe'
              src={pdfUrl}
              title={formInfo.title}
              w='100%'
              h={800}
              bd={0}
              display='block'
            />
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
