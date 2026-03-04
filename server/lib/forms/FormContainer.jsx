import React from 'react';

// Reset styles scoped to the container class so embedded mode doesn't leak into the parent app.
// In standalone mode the container IS the <body>, so the scoped selector still works.
const embeddedCss = `
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
const standaloneCss = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
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
export default function FormContainer ({ children, standalone = true }) {
  if (standalone) {
    return (
      <html lang='en'>
        <head>
          <meta charSet='utf-8' />
          <link rel='preconnect' href='https://fonts.googleapis.com' />
          <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin />
          <link href='https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap' rel='stylesheet' />
          {/* eslint-disable-next-line react/no-danger */}
          <style dangerouslySetInnerHTML={{ __html: standaloneCss }} />
        </head>
        <body className='form-container'>
          {children}
        </body>
      </html>
    );
  }

  return (
    <div className='form-container'>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: embeddedCss }} />
      {children}
    </div>
  );
}
