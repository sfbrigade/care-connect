import { generateJsxPdf } from '../generate.js';

export async function generatePdf (formData) {
  const { default: Form647f } = await import('#lib/forms/dist/Form647f.js');
  return generateJsxPdf(Form647f, formData, 'SFPD 647(f) Report');
}
