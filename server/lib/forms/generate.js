// generates the PDF buffer for a single form.
// opts.cacheBust - if true, appends a timestamp query string to dynamic imports
//   to bypass Node's module cache (used in development)
export async function generateFormPdfBuffer (form, formData, user, opts = {}) {
  const cacheBust = opts.cacheBust ? `?t=${Date.now()}` : '';

  let pdfBuffer;

  if (form.generatorType === 'pdf') {
    const { metadata } = await import(`#lib/forms/dist/${form.componentName}.js${cacheBust}`);
    pdfBuffer = Buffer.from(await metadata.generatePdf(formData, user));
  } else {
    const [{ renderFormToHtml, renderToPdf }, { default: FormComponent }] = await Promise.all([
      import('#lib/pdf.js'),
      import(`#lib/forms/dist/${form.componentName}.js${cacheBust}`),
    ]);

    const html = await renderFormToHtml(FormComponent, formData, { title: form.title });
    pdfBuffer = await renderToPdf(html);
  }

  return pdfBuffer;
}
