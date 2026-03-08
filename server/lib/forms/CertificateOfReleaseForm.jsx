import React from 'react';
import { z } from 'zod';

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
function Field ({ value, width, label, style = {} }) {
  const valueStyle = width ? { minWidth: width } : { flex: '1' };

  // include a non-breaking space if the value is empty so that the value line takes up vertical space
  return (
    <span className='field' style={style}>
      <span className='value' style={valueStyle}>{value || <>&nbsp;</>}</span>
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

export const metadata = {
  title: 'Certificate of Release',
  downloadFilename: (id) => `cert-Certificate-of-Release-${id}.pdf`,

  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdByOrganization: true,
        createdByUnit: true,
        createdByTitle: true,
      },
    },
    createdBy: {
      include: {
        organization: true,
        unit: true,
        title: true,
      },
    },
    releasedBy: {
      include: {
        organization: true,
        unit: true,
        title: true,
      },
    },
  },

  dataSchema: z.object({
    subjectName: z.string(),
    detentionDate: z.string().nullable(),
    releaseDate: z.string(),
    deputyTitle: z.string(),
    deputyName: z.string(),
    deputyBadge: z.string(),
    unitIdentifier: z.string(),
  }),

  transformData (deflection) {
    const subject = deflection.subject;
    const subjectName = subject
      ? [subject.firstName, subject.middleInitial, subject.lastName].filter(Boolean).join(' ')
      : '';

    const deputy = deflection.releasedBy || deflection.createdBy;
    const deputyTitle = deputy?.title?.name || '';
    const deputyName = deputy ? `${deputy.firstName} ${deputy.lastName}` : '';
    const deputyBadge = deputy?.badgeNumber || '';
    const unitIdentifier = deflection.incident?.createdByUnit?.name ||
      deputy?.unit?.name ||
      '';

    return {
      subjectName,
      detentionDate: deflection.createdAt?.toISOString() || null,
      releaseDate: deflection.releasedAt.toISOString(),
      deputyTitle,
      deputyName,
      deputyBadge,
      unitIdentifier,
    };
  },
};

export default function CertificateOfReleaseForm ({ data = {} }) {
  const {
    subjectName = '',
    detentionDate = null,
    releaseDate = null,
    deputyTitle = '',
    deputyName = '',
    deputyBadge = '',
    unitIdentifier = '',
  } = data;

  const detention = formatDate(detentionDate);
  const detentionTime = formatTime(detentionDate);
  const release = formatDate(releaseDate);
  const releaseTime = formatTime(releaseDate);

  return (
    <>
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
            <div>Deputy:</div>
            <div className='fields'>
              <div>
                <Field value={deputyTitle} label='Title' width='8ch' />
                <Field value={deputyName} label='Name' width='15ch' />
                <Field value={deputyBadge} label='Star#' width='8ch' />
                <Field value={unitIdentifier} label='Unit' width='10ch' />
              </div>
              <div className='signature'>
                {deputyName}
              </div>
            </div>
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
