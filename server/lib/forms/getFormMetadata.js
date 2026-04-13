import { metadata as cert, generatePdf as certPdf } from './cert/index.js';
import { metadata as f849b, generatePdf as f849bPdf } from './849b/index.js';
import { metadata as f647f, generatePdf as f647fPdf } from './647f/index.js';

const FORMS = {
  cert:   { ...cert,  generatePdf: certPdf },
  '849b': { ...f849b, generatePdf: f849bPdf },
  '647f': { ...f647f, generatePdf: f647fPdf },
};

export async function getFormMetadata () {
  return FORMS;
}
