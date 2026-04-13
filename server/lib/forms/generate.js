// renders a JSX form component to PDF via Chromium.
// used by jsx-based forms in their metadata.generatePdf() implementation.
// pdf.js is dynamically imported to avoid eagerly loading puppeteer.
export async function generateJsxPdf (FormComponent, formData, title) {
  const { renderFormToHtml, renderToPdf } = await import('#lib/pdf.js');
  const html = await renderFormToHtml(FormComponent, formData, { title });
  return renderToPdf(html);
}

// generates the PDF buffer for a single form.
export async function generateFormPdfBuffer (form, formData, user) {
  return Buffer.from(await form.generatePdf(formData, user));
}
