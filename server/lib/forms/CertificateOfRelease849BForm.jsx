import React from 'react';
import css from './pdf-forms.css';

const FORM_TIMEZONE = 'America/Los_Angeles';

function formatDate (dateStr) {
  if (!dateStr) return { month: '', date: '', year: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: '', date: '', year: '' };
  const opts = { timeZone: FORM_TIMEZONE };
  return {
    month: d.toLocaleString('en-US', { ...opts, month: 'long' }),
    date: d.toLocaleString('en-US', { ...opts, day: 'numeric' }),
    year: d.toLocaleString('en-US', { ...opts, year: 'numeric' }),
  };
}

function formatTime (dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { timeZone: FORM_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Underlined inline field with an optional sub-label. */
function Field ({ value, width, label }) {
  const valueStyle = width ? { minWidth: width } : { flex: '1' };
  return (
    <span className='field'>
      <span className='value' style={valueStyle}>{value || ''}</span>
      {label && <span className='label'>{label}</span>}
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
      <span className='value'>{value}</span>
      <span className='labels'>
        <span>Month</span>
        <span>Date</span>
        <span>Year</span>
        {showTime && <span>Time</span>}
      </span>
    </span>
  );
}

function Header () {
  return (
    <header>
      Care<span style={{ color: '#888' }}>Connect</span> <span style={{ fontWeight: 'bold', color: '#bbb' }}>RESET</span>
    </header>
  );
}

// TODO: inject the css in FormContainer so it's shared across forms

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
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: pageCSS }} />
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className='page'>
        <Header />

        <h1 className='title'>
          San Francisco Sheriff's Department Certificate of Release
        </h1>

        {/* ── Paragraph 1: detention ── */}
        <p>
          As required by the provisions of Penal Code Section 851.6 (as amended by Stats 1975,
          ch.1117), I hereby certify that the taking into custody
          <span className='field-block'>
            <span>of{' '}
              <Field value={subjectName} label="Subject's Name" />{' '}
            </span>
            <span>
              on{' '}
              <DateField month={detention.month} date={detention.date} year={detention.year} />{' '}
            </span>
            <span>
              at{' '}
              <Field value={detentionTime} width='55pt' label='Time' />{' '}
              hours
            </span>
          </span>
          by the San Francisco Sheriff&apos;s Department was a detention only, not an arrest.
        </p>

        {/* ── Paragraph 2: release ── */}
        <p style={{ marginTop: '2em' }}>
          <Field value={subjectName} label="Subject's Name" />{' '}
          was released on{' '}
          <DateField month={release.month} date={release.date} year={release.year} time={releaseTime} />{' '}
          by the San Francisco Sheriff&apos;s Department pursuant to the provisions of:
        </p>

        {/* ── Legal text ── */}
        <blockquote>
          paragraph (1) of subdivision (b) of Penal Code Section 849, paragraph (3) of Penal
          Code Section 849, Penal Code Section 849.5, and Penal Code Section 851.6 - pertinent
          portions of which appear on the reverse of this certificate.
        </blockquote>

        {/* ── Signature section ── */}
        <div className='sig-section'>
          <div className='sig-row'>
            <span className='label'>Deputy&apos;s Rank, Name &amp; Star#</span>
            <span className='line'>{deputyRankNameStar}</span>
            <span className='unit-label'>Unit Identifier:</span>
            <span className='unit-line'>{unitIdentifier}</span>
          </div>
          <div className='print-label'>Print</div>

          <div className='sig-row'>
            <span className='label'>Deputy&apos;s Signature &amp; Star#</span>
            <span className='line' />
          </div>
        </div>

        {/* ── Footer ── */}
        <footer>
          <span>
            Generated {new Date().toLocaleString('en-US', { timeZone: FORM_TIMEZONE, hour12: false })}
          </span>
          <span className='right'>
            Updated 4/22/2019
          </span>
        </footer>
      </div>
    </>
  );
}
