import React from 'react';
import { z } from 'zod';
import { FORM_TIMEZONE, formatDateTime24, formatDateOnly, titleCase } from './formUtils.js';
import { Header, Row, SectionHeader } from './formComponents.jsx';

function buildNarrative ({ arrestedAt, officerName, subjectFullName, arrivedAtReset, transferredAt, releaseReason }) {
  const t1 = formatDateTime24(arrestedAt) || '[date/time]';
  const officer = officerName || '[SFPD Officer name]';
  const person = subjectFullName || '[person full name]';
  const t2 = formatDateTime24(arrivedAtReset) || '[date/time]';
  const t3 = formatDateTime24(transferredAt) || '[date/time]';
  const reason = releaseReason || '[release reason]';

  return `At ${t1}, SFPD Officer ${officer} arrested ${person} because they were found to be under the influence of a controlled substance or alcohol in a public location. ${person} was brought to RESET at ${t2} and transferred to Sheriff's Office custody at ${t3}. They were subsequently released from their detention due to: ${reason}.`;
}

/*
 * Override pdf-forms.css page constraints so this form can grow beyond
 * one page without clipping content, and so the footer flows inline after
 * the last row rather than overlapping it.
 *
 * !important on height: the pdf-forms.css rule uses CSS nesting which may
 * not be processed before this style block, so we force the override.
 * The padding is re-declared here so it isn't lost if the nested @media
 * screen rule in pdf-forms.css doesn't win the cascade.
 *
 * Specificity: .form-container .page.form-849b [0,3,0] > .form-container .page [0,2,0]
 */
const pageCSS = `
  .form-container .page.form-849b {
    height: auto !important;
    min-height: calc(11in - var(--page-margin-top) - var(--page-margin-bottom));
  }
  .form-container .page.form-849b footer {
    position: static;
    margin-top: 1.5em;
  }
  @media screen {
    .form-container .page.form-849b {
      padding: var(--page-margin-top) var(--page-margin-right) var(--page-margin-bottom) var(--page-margin-left);
    }
    .form-container .page.form-849b footer {
      bottom: auto;
      left: auto;
      right: auto;
    }
  }
`;

export const metadata = {
  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdBy: {
          include: {
            organization: true,
            unit: true,
            title: true,
          },
        },
      },
    },
    releaseReason: true,
  },

  dataSchema: z.object({
    incidentId: z.union([z.number(), z.string()]),
    cadNumber: z.string(),
    arrestedAt: z.string().nullable(),
    arrestLocation: z.string(),
    officerName: z.string(),
    officerBadge: z.string(),
    subjectName: z.string(),
    subjectFullName: z.string(),
    subjectRace: z.string(),
    subjectSex: z.string(),
    subjectDOB: z.string().nullable(),
    subjectAddress: z.string(),
    subjectZip: z.string(),
    subjectDL: z.string(),
    subjectLocalId: z.string(),
    arrivedAtReset: z.string().nullable(),
    transferredAt: z.string().nullable(),
    releasedAt: z.string(),
    releaseReason: z.string(),
  }),

  transformData (deflection) {
    const incident = deflection.incident;
    const subject = deflection.subject;

    let subjectName = '';
    let subjectFullName = '';
    if (subject) {
      subjectName = [subject.lastName, subject.firstName, subject.middleInitial]
        .filter(Boolean)
        .join(', ');
      subjectFullName = [subject.firstName, subject.middleInitial, subject.lastName]
        .filter(Boolean)
        .join(' ');
    }

    const incidentCreator = incident?.createdBy;
    const officerName = incidentCreator
      ? `${incidentCreator.firstName} ${incidentCreator.lastName}`
      : '';
    const officerBadge = incident?.createdByBadgeNumber || incidentCreator?.badgeNumber || '';

    const arrestLocation = [incident?.addressLine1, incident?.city, incident?.state]
      .filter(Boolean)
      .join(', ');

    const subjectAddress = [subject?.addressLine1, subject?.city, subject?.state]
      .filter(Boolean)
      .join(', ');

    return {
      incidentId: incident?.id ?? '',
      cadNumber: incident?.cadNumber || '',
      arrestedAt: incident?.arrestedAt?.toISOString() || null,
      arrestLocation,
      officerName,
      officerBadge,
      subjectName,
      subjectFullName,
      subjectRace: subject?.race || '',
      subjectSex: subject?.sex || '',
      subjectDOB: subject?.dateOfBirth?.toISOString() || null,
      subjectAddress,
      subjectZip: subject?.postalCode || '',
      subjectDL: subject?.driverLicense || '',
      subjectLocalId: subject?.localId || '',
      arrivedAtReset: incident?.arrivedAt?.toISOString() || null,
      transferredAt: deflection.transferredAt?.toISOString() || null,
      releasedAt: deflection.releasedAt.toISOString(),
      releaseReason: deflection.releaseReason?.name || '',
    };
  },
};

export default function Form849b ({ data = {} }) {
  const {
    incidentId = '',
    cadNumber = '',
    arrestedAt = null,
    arrestLocation = '',
    officerName = '',
    officerBadge = '',
    subjectName = '',
    subjectFullName = '',
    subjectRace = '',
    subjectSex = '',
    subjectDOB = null,
    subjectAddress = '',
    subjectZip = '',
    subjectDL = '',
    subjectLocalId = '',
    arrivedAtReset = null,
    transferredAt = null,
    releaseReason = '',
  } = data;

  const incidentNumber = cadNumber || (incidentId ? String(incidentId) : '');
  const narrative = buildNarrative({ arrestedAt, officerName, subjectFullName, arrivedAtReset, transferredAt, releaseReason });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageCSS }} />
      <div className='page form-849b'>
        <Header />

        <h1 className='title'>
          San Francisco Sheriff’s Office
          &mdash;
          Sheriff’s Patrol Unit
          <br />
          849(b) Report
        </h1>

        <table className='form-table'>
          <tbody>
            <SectionHeader title='Incident Information' />
            <Row label='Incident number' value={incidentNumber} />
            <Row label='Date/time of arrest (24 hour clock)' value={formatDateTime24(arrestedAt)} />
            <Row label='Location of arrest' value={arrestLocation} />

            <SectionHeader title='Deputy Information' />
            <Row label='Reporting deputy' value={officerName} />
            <Row label='Star' value={officerBadge} />
            <Row label='Signature' value={officerName} />
            <Row label='Report reviewed by' value='' />
            <Row label='Watch commander approval' value='' />

            <SectionHeader title='Administrative' />
            <Row label='Assign to SFSD CIU' value='No' />
            <Row label='Copies to outside Agencies' value='SFPD' />
            <Row label='Assigned by' value='' />
            <Row label='Code' value='D' />

            <SectionHeader title='Subject Information' />
            <Row label='Name' value={subjectName} />
            <Row label='Race' value={titleCase(subjectRace)} />
            <Row label='Sex' value={titleCase(subjectSex)} />
            <Row label='DOB' value={formatDateOnly(subjectDOB)} />
            <Row label='Alias' value='' />
            <Row label='Height, weight, hair, eyes' value='' />
            <Row label='Address' value={subjectAddress} />
            <Row label='Zipcode' value={subjectZip} />
            <Row label='Contact phone' value='' />
            <Row label='ID no' value={subjectDL} />
            <Row label='NO/XNO' value={subjectLocalId} />
            <Row label='Other info' value='' />

            <SectionHeader title='Stop Details' />
            <Row label='Reason for stop' value='Other' />
            <Row label='Subject handcuffed' value='Yes' />
            <Row label='Search' value='Other search' />
          </tbody>
        </table>

        <div className='narrative-section'>
          <div className='narrative-label'>Narrative</div>
          <div className='narrative-text'>{narrative}</div>
        </div>

        <footer>
          <span>
            Generated {new Date().toLocaleString('en-US', { timeZone: FORM_TIMEZONE, hour12: false })}
          </span>
        </footer>
      </div>
    </>
  );
}
