import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Alert, Center, Loader } from '@mantine/core';

import FormContainer from '../../../server/lib/forms/FormContainer.jsx';
import CertificateOfRelease849BForm from '../../../server/lib/forms/CertificateOfRelease849BForm.jsx';

// Registry mapping form IDs (from the URL) to their React components.
// Add new form entries here as they are created.
const FORM_REGISTRY = {
  '849b': CertificateOfRelease849BForm,
};

async function fetchFormData (formId, deflectionId) {
  const response = await fetch(`/api/forms/${formId}/data/${deflectionId}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Failed to load form data (${response.status})`);
  }
  return response.json();
}

export default function FormPreview () {
  const { formId, deflectionId } = useParams();
  const FormComponent = FORM_REGISTRY[formId];

  const { data, isLoading, error } = useQuery({
    queryKey: ['form-data', formId, deflectionId],
    queryFn: () => fetchFormData(formId, deflectionId),
    enabled: !!FormComponent && !!deflectionId,
  });

  if (!FormComponent) {
    return (
      <Alert color='red' title='Unknown form' m='md'>
        No form found for ID &quot;{formId}&quot;.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert color='red' title='Failed to load form' m='md'>
        {error.message}
      </Alert>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#e0e0e0',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '816px',  // 8.5in at 96dpi
        minHeight: '1056px', // 11in at 96dpi
        backgroundColor: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        // Mirror the @page margins so the inner content area is 720px —
        // the same as Puppeteer's print content area (8.5in - 0.5in - 0.5in).
        padding: '48px 48px 62px 48px', // 0.5in 0.5in 0.65in 0.5in
      }}>
        <FormContainer standalone={false}>
          <FormComponent data={data} />
        </FormContainer>
      </div>
    </div>
  );
}
