// renders a JSX form component to PDF via Chromium.
// used by jsx-based forms in their metadata.generatePdf() implementation.
// pdf.js is dynamically imported to avoid eagerly loading puppeteer.
export async function generateJsxPdf (FormComponent, formData, title) {
  const { renderFormToHtml, renderToPdf } = await import('#lib/pdf.js');
  const html = await renderFormToHtml(FormComponent, formData, { title });
  return renderToPdf(html);
}

// generates the PDF buffer for a single form.
// opts.cacheBust - if true, appends a timestamp query string to dynamic imports
//   to bypass Node's module cache (used in development)
export async function generateFormPdfBuffer (form, formData, user, opts = {}) {
  const cacheBust = opts.cacheBust ? `?t=${Date.now()}` : '';
  const { metadata } = await import(`#lib/forms/dist/${form.componentName}.js${cacheBust}`);
  return Buffer.from(await metadata.generatePdf(formData, user));
}
