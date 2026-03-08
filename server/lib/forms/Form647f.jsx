import React from 'react';
import { z } from 'zod';
import { FORM_TIMEZONE, formatDateTime24, formatDateOnly, titleCase } from './formUtils.js';
import { Header, Row, SectionHeader } from './formComponents.jsx';

/*
 * Override pdf-forms.css page constraints so this form can grow beyond
 * one page without clipping content, and so the footer flows inline.
 */
const pageCSS = `
  .form-container .page.form-647f {
    height: auto !important;
    min-height: calc(11in - var(--page-margin-top) - var(--page-margin-bottom));
  }
  .form-container .page.form-647f footer {
    position: static;
    margin-top: 1.5em;
  }
  @media screen {
    .form-container .page.form-647f {
      padding: var(--page-margin-top) var(--page-margin-right) var(--page-margin-bottom) var(--page-margin-left);
    }
    .form-container .page.form-647f footer {
      bottom: auto;
      left: auto;
      right: auto;
    }
  }
`;

export const metadata = {
  title: '647(f) Transfer Form',
  downloadFilename: (id) => `647f-transfer-form-${id}.pdf`,
  requiresRelease: false,

  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdBy: {
          include: {
            organization: true,
            unit: true,
          },
        },
      },
    },
    facility: true,
    createdBy: {
      include: {
        organization: true,
        unit: true,
      },
    },
  },

  dataSchema: z.object({
    deflectionId: z.number(),
    subjectLastName: z.string(),
    subjectFirstName: z.string(),
    subjectMiddleInitial: z.string(),
    subjectRace: z.string(),
    subjectSex: z.string(),
    subjectDOB: z.string().nullable(),
    subjectAddress: z.string(),
    subjectDL: z.string(),
    subjectLocalId: z.string(),
    cadNumber: z.string(),
    arrestedAt: z.string().nullable(),
    officerName: z.string(),
    arrestLocation: z.string(),
    officerUnit: z.string(),
    officerBadge: z.string(),
    agency: z.string(),
    charge: z.string(),
    justification: z.string(),
    substanceFound: z.boolean(),
    paraphernaliaFound: z.boolean(),
    facilityName: z.string(),
    facilityAddress: z.string(),
  }),

  transformData (deflection) {
    const subject = deflection.subject;
    const incident = deflection.incident;
    const officer = incident?.createdBy || deflection.createdBy;

    const subjectAddress = [subject?.addressLine1, subject?.city, subject?.state]
      .filter(Boolean)
      .join(', ');

    const arrestLocation = [incident?.addressLine1, incident?.city, incident?.state]
      .filter(Boolean)
      .join(', ');

    const officerName = officer
      ? `${officer.firstName} ${officer.lastName}`
      : '';
    const officerBadge = incident?.createdByBadgeNumber || officer?.badgeNumber || '';
    const officerUnit = incident?.createdByUnit?.name || officer?.unit?.name || '';
    const agency = officer?.organization?.name || '';

    const facility = deflection.facility;
    const facilityAddress = [facility?.addressLine1, facility?.city, facility?.state, facility?.postalCode]
      .filter(Boolean)
      .join(', ');

    return {
      deflectionId: deflection.id,
      subjectLastName: subject?.lastName || '',
      subjectFirstName: subject?.firstName || '',
      subjectMiddleInitial: subject?.middleInitial || '',
      subjectRace: subject?.race || '',
      subjectSex: subject?.sex || '',
      subjectDOB: subject?.dateOfBirth?.toISOString() || null,
      subjectAddress,
      subjectDL: subject?.driverLicense || '',
      subjectLocalId: subject?.localId || '',
      cadNumber: incident?.cadNumber || '',
      arrestedAt: incident?.arrestedAt?.toISOString() || null,
      officerName,
      arrestLocation,
      officerUnit,
      officerBadge,
      agency,
      charge: '647(f) RWS',
      justification: deflection.behavior || '',
      substanceFound: deflection.narcoticsSubstance === true,
      paraphernaliaFound: deflection.narcoticsParaphernalia === true,
      facilityName: facility?.name || '',
      facilityAddress,
    };
  },
};

export default function Form647f ({ data = {} }) {
  const {
    subjectLastName = '',
    subjectFirstName = '',
    subjectMiddleInitial = '',
    subjectRace = '',
    subjectSex = '',
    subjectDOB = null,
    subjectAddress = '',
    subjectDL = '',
    subjectLocalId = '',
    cadNumber = '',
    arrestedAt = null,
    officerName = '',
    arrestLocation = '',
    officerUnit = '',
    officerBadge = '',
    agency = '',
    charge = '',
    justification = '',
    substanceFound = false,
    paraphernaliaFound = false,
    deflectionId = '',
    facilityName = '',
    facilityAddress = '',
  } = data;

  const substanceNot = substanceFound ? '' : 'not ';
  const paraphernaliaNot = paraphernaliaFound ? '' : 'not ';
  const narcoticsStatement = `SFPD Officer searched for narcotics. Subject was ${substanceNot}found to be in possession of a controlled substance. Subject was ${paraphernaliaNot}found to be in possession of narcotics paraphernalia.`;

  const narrativeParts = [justification, narcoticsStatement].filter(Boolean);
  const narrative = narrativeParts.join('\n\n');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageCSS }} />
      <div className='page form-647f'>
        <Header />

        <h1 className='title'>647(f) Transfer Form</h1>

        <table className='form-table'>
          <tbody>
            <SectionHeader title='Subject Information' />
            <Row label='Subject Last Name' value={subjectLastName} required />
            <Row label='Subject First Name' value={subjectFirstName} required />
            <Row label='Subject Middle Initial' value={subjectMiddleInitial} />
            <Row label='Race' value={titleCase(subjectRace)} required />
            <Row label='Sex' value={titleCase(subjectSex)} required />
            <Row label='Date of Birth (DOB)' value={formatDateOnly(subjectDOB)} required />
            <Row label='Address' value={subjectAddress} />
            <Row label="Driver's License" value={subjectDL} />
            <Row label='Local ID / SF #' value={subjectLocalId} />

            <SectionHeader title='Arrest Information' />
            <Row label='CAD Number' value={cadNumber} required />
            <Row label='Date/Time Arrested' value={formatDateTime24(arrestedAt)} required />
            <Row label='Name of Transporting Officer' value={officerName} required />
            <Row label='Location Arrested' value={arrestLocation} required />
            <Row label='Unit' value={officerUnit} required />
            <Row label='Badge Number / Star Number' value={officerBadge} required />
            <Row label='Agency' value={agency} required />
            <Row label='Charge' value={charge || '647(f) RWS'} required />

            <SectionHeader title='Additional Information' />
            <Row label='Hold ID' value={String(deflectionId)} />
            {facilityName && <Row label='Facility' value={facilityName} />}
            {facilityAddress && <Row label='Facility Address' value={facilityAddress} />}
          </tbody>
        </table>

        <div className='narrative-section'>
          <div className='narrative-label'>
            647(f) RWS Justification / Narrative<span style={{ color: '#c00' }}>*</span>
          </div>
          <div className='narrative-text'>{narrative}</div>
        </div>

        <div className='footer-note'>* Required field</div>

        <footer>
          <span>
            Generated {new Date().toLocaleString('en-US', { timeZone: FORM_TIMEZONE, hour12: false })}
          </span>
        </footer>
      </div>
    </>
  );
}
