import React from 'react';
import css from './pdf-forms.css';

const FORM_TIMEZONE = 'America/Los_Angeles';

function formatDate (dateStr) {
  if (!dateStr) return { month: '', date: '', year: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: '', date: '', year: '' };
  const opts = { timeZone: FORM_TIMEZONE };
  return {
    month: d.toLocaleString('en-US', { ...opts, month: '2-digit' }),
    date: d.toLocaleString('en-US', { ...opts, day: '2-digit' }),
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

function Header () {
  return (
    <header>
      Care<span style={{ color: '#888' }}>Connect</span> <span style={{ fontWeight: 'bold', color: '#bbb' }}>RESET</span>
    </header>
  );
}

// TODO: inject the css in FormContainer so it's shared across forms

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

export default function CertificateOfReleaseForm ({ data = {} }) {
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
          San Francisco Sheriff’s Department Certificate of Release
        </h1>

        {/* ── Paragraph 1: detention ── */}
        <p>
          As required by the provisions of Penal Code Section 851.6 (as amended by Stats 1975,
          ch.1117), I hereby certify that the taking into custody of{' '}
          <Field value={subjectName} label="Subject's Name" />{' '}
          on{' '}
          <Field value={`${detention.year}-${detention.month}-${detention.date}`} label='Date' />{' '}
          at{' '}
          <Field value={detentionTime} label='Time' />{' '}
          hours by the San Francisco Sheriff’s Department was a detention only, not an arrest.
        </p>

        {/* ── Paragraph 2: release ── */}
        <p style={{ marginTop: '2em' }}>
          <Field value={subjectName} label="Subject's Name" />{' '}
          was released on{' '}
          <Field value={`${release.year}-${release.month}-${release.date}`} label='Date' />{' '}
          at{' '}
          <Field value={releaseTime} label='Time' />{' '}
          hours by the San Francisco Sheriff’s Department pursuant to the provisions of:
        </p>

        {/* ── Legal text ── */}
        <blockquote>
          paragraph (1) of subdivision (b) of Penal Code Section 849, paragraph (3) of Penal
          Code Section 849, Penal Code Section 849.5, and Penal Code Section 851.6 &mdash; pertinent
          portions of which appear on the reverse of this certificate.
        </blockquote>

        {/* ── Signature section ── */}
        <div className='sig-section'>
          <div className='sig-row'>
            <span className='label'>Deputy’s Rank, Name &amp; Star#</span>
            <span className='line'>{deputyRankNameStar}</span>
            <span className='unit-label'>Unit Identifier:</span>
            <span className='unit-line'>{unitIdentifier}</span>
          </div>
          <div className='print-label'>Print</div>

          <div className='sig-row'>
            <span className='label'>Deputy’s Signature &amp; Star#</span>
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
