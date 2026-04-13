export async function generatePdf (formData) {
  const { default: Form647f } = await import('#lib/forms/dist/Form647f.js');
  const { renderFormToHtml, renderToPdf } = await import('#lib/pdf.js');
  const html = await renderFormToHtml(Form647f, formData, { title: 'SFPD 647(f) Report' });
  return renderToPdf(html);
}
