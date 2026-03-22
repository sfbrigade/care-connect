import FormCoR from 'care-connect-server/lib/forms/jsx/FormCoR.jsx';
import Form849b from 'care-connect-server/lib/forms/jsx/Form849b.jsx';
import Form647f from 'care-connect-server/lib/forms/jsx/Form647f.jsx';
import { FORM_REGISTRY as sharedForms } from '@care-connect/shared/forms';

// Maps form IDs to their React components (for in-browser preview).
// All other metadata (title, labels, filenames) comes from the shared registry.
const components = {
  cert: FormCoR,
  '849b': Form849b,
  '647f': Form647f,
};

export default Object.fromEntries(
  Object.entries(sharedForms).map(([id, meta]) => [id, { ...meta, component: components[id] }])
);
