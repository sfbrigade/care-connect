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
    <FormContainer standalone={false}>
      <FormComponent data={data} />
    </FormContainer>
  );
}
