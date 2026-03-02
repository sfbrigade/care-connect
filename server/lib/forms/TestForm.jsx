import React from 'react';

const css = `
  @page {
    size: letter;
    margin: 0.5in;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10pt;
    color: #000;
  }

  h1.form-title {
    font-size: 18pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20pt;
  }

  .section {
    margin-bottom: 15pt;
  }

  .section-title {
    font-size: 12pt;
    font-weight: bold;
    border-bottom: 1pt solid #333;
    padding-bottom: 4pt;
    margin-bottom: 8pt;
  }

  .field-row {
    display: flex;
    margin-bottom: 6pt;
  }

  .field-label {
    font-weight: bold;
    width: 120pt;
    flex-shrink: 0;
  }

  .field-value {
    flex: 1;
  }

  .notes-text {
    font-size: 10pt;
    line-height: 1.4;
  }

  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    font-size: 8pt;
    color: #666;
    display: flex;
    justify-content: space-between;
    border-top: 0.5pt solid #ccc;
    padding-top: 4pt;
  }
`;

function Field ({ label, value }) {
  return (
    <div className='field-row'>
      <span className='field-label'>{label}:</span>
      <span className='field-value'>{value || 'N/A'}</span>
    </div>
  );
}

function Section ({ title, children }) {
  return (
    <div className='section'>
      <div className='section-title'>{title}</div>
      {children}
    </div>
  );
}

export default function TestForm ({ data = {} }) {
  const {
    subjectFirstName = 'John',
    subjectLastName = 'Doe',
    dateOfBirth = '1990-01-15',
    caseNumber = '2026-TEST-001',
    officerName = 'Officer Smith',
    badgeNumber = '12345',
    incidentDate = new Date().toLocaleDateString(),
    incidentLocation = '123 Main Street, San Francisco, CA',
    notes = 'This is a test form generated using Chromium-based HTML-to-PDF rendering. It demonstrates how to create PDF documents using React components with real CSS.',
  } = data;

  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <h1 className='form-title'>Test Transfer Form</h1>

        <Section title='Subject Information'>
          <Field label='Last Name' value={subjectLastName} />
          <Field label='First Name' value={subjectFirstName} />
          <Field label='Date of Birth' value={dateOfBirth} />
        </Section>

        <Section title='Case Information'>
          <Field label='Case Number' value={caseNumber} />
          <Field label='Incident Date' value={incidentDate} />
          <Field label='Location' value={incidentLocation} />
        </Section>

        <Section title='Officer Information'>
          <Field label='Officer Name' value={officerName} />
          <Field label='Badge Number' value={badgeNumber} />
        </Section>

        <Section title='Notes'>
          <p className='notes-text'>{notes}</p>
        </Section>

        <div className='footer'>
          <span>Generated: {new Date().toLocaleString()}</span>
          <span>Page 1 of 1</span>
        </div>
      </body>
    </html>
  );
}
