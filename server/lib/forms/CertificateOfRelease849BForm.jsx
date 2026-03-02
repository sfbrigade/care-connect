import React from 'react';

function formatDate (dateStr) {
  if (!dateStr) return { month: '', date: '', year: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: '', date: '', year: '' };
  return {
    month: d.toLocaleString('en-US', { month: 'long' }),
    date: String(d.getDate()),
    year: String(d.getFullYear()),
  };
}

function formatTime (dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const css = `
  @page {
    size: letter;
    margin: 0.5in 0.5in 0.65in 0.5in;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #000;
  }

  .page {
    position: relative;
    min-height: 9.5in;
  }

  h1.title {
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20pt;
    letter-spacing: 0.04em;
    line-height: 1.3;
  }

  /*
   * An inline field renders as a small flex column:
   *   ┌──────────────────┐
   *   │   value text     │  ← underlined border-bottom
   *   │  sub-label text  │  ← tiny centred label
   *   └──────────────────┘
   * inline-flex + vertical-align:bottom keeps the underline
   * flush with the surrounding text baseline.
   */
  .field {
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
    vertical-align: bottom;
    margin: 0 2px;
  }

  .field__value {
    border-bottom: 1pt solid #000;
    padding: 0 4px 1px;
    min-height: 15pt;
    font-weight: bold;
  }

  .field__label {
    font-size: 7.5pt;
    color: #444;
    text-align: center;
    margin-top: 1pt;
    font-weight: normal;
  }

  /* Date-style field with Month / Date / Year (/ Time) sub-labels */
  .date-field {
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
    vertical-align: bottom;
    margin: 0 2px;
    min-width: 220pt;
  }

  .date-field__value {
    border-bottom: 1pt solid #000;
    padding: 0 4px 1px;
    min-height: 15pt;
    letter-spacing: 0.1em;
  }

  .date-field__labels {
    display: flex;
    justify-content: space-around;
    font-size: 7.5pt;
    color: #444;
    margin-top: 1pt;
  }

  .para {
    margin-bottom: 6pt;
    line-height: 1.8;
  }

  /* Indented legal text */
  .legal-block {
    margin: 10pt 0 10pt 36pt;
    font-size: 11pt;
    line-height: 1.5;
  }

  /* Signature rows */
  .sig-section {
    margin-top: 20pt;
  }

  .sig-row {
    display: flex;
    align-items: flex-end;
    margin-bottom: 3pt;
  }

  .sig-row__label {
    flex-shrink: 0;
    width: 175pt;
  }

  .sig-row__line {
    flex: 1;
    border-bottom: 1pt solid #000;
    min-height: 15pt;
    padding: 0 4px 1px;
  }

  .sig-row__unit-label {
    flex-shrink: 0;
    width: 90pt;
    text-align: right;
    margin-left: 8pt;
  }

  .sig-row__unit-line {
    flex-shrink: 0;
    width: 90pt;
    border-bottom: 1pt solid #000;
    min-height: 15pt;
    padding: 0 4px 1px;
    margin-left: 4pt;
  }

  .sig-print-label {
    font-size: 7.5pt;
    color: #444;
    text-align: center;
    margin-top: 1pt;
    margin-bottom: 10pt;
    padding-left: 175pt;
  }

  /* Footer pinned to bottom of the printable area */
  .footer {
    position: absolute;
    bottom: -0.35in;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
  }

  .footer__right {
    text-align: right;
  }
`;

/** Underlined inline field with an optional sub-label. */
function Field ({ value, width, label }) {
  const valueStyle = width ? { minWidth: width } : { flex: '1' };
  return (
    <span className='field'>
      <span className='field__value' style={valueStyle}>{value || ''}</span>
      {label && <span className='field__label'>{label}</span>}
    </span>
  );
}

/** Date field with Month / Date / Year (and optionally Time) sub-labels. */
function DateField ({ month, date, year, time }) {
  const parts = [month, date, year, time].filter((v) => v !== undefined && v !== null && v !== '');
  const value = parts.join('\u00a0\u00a0');
  const showTime = time !== undefined && time !== null && time !== '';
  return (
    <span className='date-field'>
      <span className='date-field__value'>{value}</span>
      <span className='date-field__labels'>
        <span>Month</span>
        <span>Date</span>
        <span>Year</span>
        {showTime && <span>Time</span>}
      </span>
    </span>
  );
}

export default function CertificateOfRelease849BForm ({ data = {} }) {
  const {
    subjectName = '',
    detentionDate = null,
    releaseDate = null,
    deputyRankNameStar = '',
    unitIdentifier = '',
  } = data;

  const detention = formatDate(detentionDate);
  const detentionTime = formatTime(detentionDate);
  const release = formatDate(releaseDate);
  const releaseTime = formatTime(releaseDate);

  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <div className='page'>
          <h1 className='title'>
            SAN FRANCISCO SHERIFF&apos;S DEPARTMENT CERTIFICATE OF RELEASE
          </h1>

          {/* ── Paragraph 1: detention ── */}
          <p className='para'>
            As required by the provisions of Penal Code Section 851.6 (as amended by Stats 1975,
            ch.1117), I hereby certify that the taking into custody of{' '}
            <Field value={subjectName} label="Subject's Name" />{' '}
            on{' '}
            <DateField month={detention.month} date={detention.date} year={detention.year} />{' '}
            at{' '}
            <Field value={detentionTime} width='55pt' label='Time' />{' '}
            hours by the San Francisco Sheriff&apos;s Department was a detention only, not an arrest.
          </p>

          {/* ── Paragraph 2: release ── */}
          <p className='para' style={{ marginTop: '10pt' }}>
            <Field value={subjectName} label="Subject's Name" />{' '}
            was released on{' '}
            <DateField month={release.month} date={release.date} year={release.year} time={releaseTime} />{' '}
            by the San Francisco Sheriff&apos;s Department pursuant to the provisions of:
          </p>

          {/* ── Legal text ── */}
          <div className='legal-block'>
            <p>
              paragraph (1) of subdivision (b) of Penal Code Section 849, paragraph (3) of Penal
              Code Section 849, Penal Code
            </p>
            <p>
              Section 849.5, and Penal Code Section 851.6 - pertinent portions of which appear on
              the reverse of this certificate.
            </p>
          </div>

          {/* ── Signature section ── */}
          <div className='sig-section'>
            <div className='sig-row'>
              <span className='sig-row__label'>Deputy&apos;s Rank, Name &amp; Star#</span>
              <span className='sig-row__line'>{deputyRankNameStar}</span>
              <span className='sig-row__unit-label'>Unit Identifier:</span>
              <span className='sig-row__unit-line'>{unitIdentifier}</span>
            </div>
            <div className='sig-print-label'>Print</div>

            <div className='sig-row'>
              <span className='sig-row__label'>Deputy&apos;s Signature &amp; Star#</span>
              <span className='sig-row__line' />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className='footer'>
            <span>White to Citizen</span>
            <span>Canary to Central Records &amp; Warrants Unit</span>
            <span className='footer__right'>
              Pink to Incident Report<br />
              Updated 04-22-2019
            </span>
          </div>
        </div>
      </body>
    </html>
  );
}
