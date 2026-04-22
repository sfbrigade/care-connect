import React from 'react';
import pdfCSS from './pdf-forms.css';

// Reset styles scoped to the container class so embedded mode doesn't leak into the parent app.
// In standalone mode the container IS the <body>, so the scoped selector still works.
const embeddedCSS = `
  .form-container * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
`;
//  @media screen {
//    /* Cancel any per-form screen margins on .page — the FormPreview wrapper
//       supplies equivalent padding so the inner content area matches the PDF. */
//    .form-container .page {
//      margin: 0;
//    }
//  }

// In standalone mode we can use the global selector freely since nothing else is on the page.
const standaloneCSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
`;

// set the margins here so we can pass them into the pageCSS template and share them with the --page-margin- variables,
// since you can use vars with @page rules.
const pageMarginX = '.75in';
const pageMarginY = '.5in';
const pageCSS = `
  @page {
    size: letter;
    margin: ${pageMarginY} ${pageMarginX};
  }
  
  .form-container {
    --page-margin-top: ${pageMarginY};
    --page-margin-right: ${pageMarginX};
    --page-margin-bottom: ${pageMarginY};
    --page-margin-left: ${pageMarginX};
  }
`;

/**
 * Shared document/page wrapper for all printable forms.
 *
 * - standalone=true  (default): renders a full <html> document suitable for
 *   server-side rendering and PDF generation via Puppeteer.
 * - standalone=false: renders a scoped <div class="form-container"> suitable
 *   for direct embedding inside a React client app without polluting its styles.
 *
 * Individual form components should:
 *   - Include their own form-specific <style> (using .form-container instead of
 *     body for font/layout rules so they work in both modes).
 *   - Render their content as plain JSX (no <html>/<head>/<body> wrapper).
 */
export default function FormContainer ({ children, standalone = true, title = 'CareConnect Form' }) {
//  const css = [
//    standalone ? standaloneCSS : embeddedCSS,
//    pageCSS,
//    pdfCSS
//  ].join('\n');

  if (standalone) {
    return (
      <html lang='en'>
        <head>
          <meta charSet='utf-8' />
          <title>{title}</title>
          <link rel='preconnect' href='https://fonts.googleapis.com' />
          <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin />
          {/* <style dangerouslySetInnerHTML={{ __html: css }} /> */}
          <style dangerouslySetInnerHTML={{ __html: standaloneCSS }} />
          <style dangerouslySetInnerHTML={{ __html: pageCSS }} />
          <style dangerouslySetInnerHTML={{ __html: pdfCSS }} />
        </head>
        <body className='form-container'>
          {children}
        </body>
      </html>
    );
  }

  return (
    <div className='form-container'>
      {/* <style dangerouslySetInnerHTML={{ __html: css }} /> */}
      <style dangerouslySetInnerHTML={{ __html: embeddedCSS }} />
      <style dangerouslySetInnerHTML={{ __html: pageCSS }} />
      <style dangerouslySetInnerHTML={{ __html: pdfCSS }} />
      {children}
    </div>
  );
}
