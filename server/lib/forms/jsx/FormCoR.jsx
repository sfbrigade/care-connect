import React from 'react';
import { z } from 'zod';
import { FORM_TIMEZONE, formatDateParts, formatTime } from '../formUtils.js';
import { Header, Field } from './formComponents.jsx';

export const metadata = {
  canGenerate (deflection) {
    return deflection.releasedAt
      ? true
      : { message: 'The Certificate of Release can only be generated after the subject has been released.' };
  },

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

export default function FormCoR ({ data = {} }) {
  const {
    subjectName = '',
    detentionDate = null,
    releaseDate = null,
    deputyTitle = '',
    deputyName = '',
    deputyBadge = '',
    unitIdentifier = '',
  } = data;

  const detention = formatDateParts(detentionDate);
  const detentionTime = formatTime(detentionDate);
  const release = formatDateParts(releaseDate);
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
