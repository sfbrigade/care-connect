import FormCoR from 'care-connect-server/lib/forms/FormCoR.jsx';
import Form849b from 'care-connect-server/lib/forms/Form849b.jsx';
import Form647f from 'care-connect-server/lib/forms/Form647f.jsx';

// Registry mapping form IDs (from the URL) to form-specific metadata and components.
// Add new form entries here as they are created.
const FORM_REGISTRY = {
  cert: {
    title: 'Certificate of Release',
    generateLabel: 'Generate Certificate of Release',
    description: (name) => `SF Sheriff's Dept Certificate of Release for ${name}`,
    downloadFilename: (deflectionId) => `cert-Certificate-of-Release-${deflectionId}.pdf`,
    component: FormCoR,
  },
  '849b': {
    title: 'SFSO 849(b) Report',
    generateLabel: 'Generate SFSO 849(b) Report',
    description: (name) => `SFSO 849(b) Report for ${name}`,
    downloadFilename: (deflectionId) => `849b-report-${deflectionId}.pdf`,
    component: Form849b,
  },
  '647f': {
    title: 'SFSO 647(f) Report',
    generateLabel: 'Generate SFSO 647(f) Report',
    description: (name) => `SFSO 647(f) Report for ${name}`,
    downloadFilename: (deflectionId) => `647f-report-${deflectionId}.pdf`,
    component: Form647f,
  },
};

export default FORM_REGISTRY;
