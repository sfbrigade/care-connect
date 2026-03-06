import { useParams } from 'react-router';
import { Alert } from '@mantine/core';

import FormCertPreview from './FormCertPreview';
import Form849BPreview from './Form849BPreview';

// Registry mapping form IDs (from the URL) to their page components.
// Add new form entries here as they are created.
const FORM_REGISTRY = {
  cert: FormCertPreview,
  '849b': Form849BPreview,
};

export default function FormPage () {
  const { formId } = useParams();
  const FormComponent = FORM_REGISTRY[formId];

  if (!FormComponent) {
    return (
      <Alert color='red' title='Unknown form' m='md'>
        No form found for ID &quot;{formId}&quot;.
      </Alert>
    );
  }

  return <FormComponent />;
}
