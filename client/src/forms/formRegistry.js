import { metadata as cert } from 'care-connect-server/lib/forms/cert/metadata.js';
import { metadata as f849b } from 'care-connect-server/lib/forms/849b/metadata.js';
import { metadata as f647f } from 'care-connect-server/lib/forms/647f/metadata.js';
import Form647f from 'care-connect-server/lib/forms/647f/Form647f.jsx';

export default {
  cert:   { ...cert,  component: null },
  '849b': { ...f849b, component: null },
  '647f': { ...f647f, component: Form647f },
};
