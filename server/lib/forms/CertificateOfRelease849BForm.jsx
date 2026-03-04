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
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
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
            Code Section 849, Penal Code Section 849.5, and Penal Code Section 851.6 - pertinent
            portions of which appear on the reverse of this certificate.
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
    </>
  );
}
