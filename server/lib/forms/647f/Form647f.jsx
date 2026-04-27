import React from 'react';
import { FORM_TIMEZONE, formatDateTime24, formatDateOnly, titleCase } from '../shared/formUtils.js';
import { Header, Row, SectionHeader } from '../shared/formComponents.jsx';

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
    supervisorBadgeNumber = '',
    agency = '',
    charge = '',
    justification = '',
    hospitalCancellationReleaseNarrative = '',
    substanceFound = false,
    paraphernaliaFound = false,
    deflectionId = '',
    facilityName = '',
    facilityAddress = '',
  } = data;

  const substanceNot = substanceFound ? '' : 'not ';
  const paraphernaliaNot = paraphernaliaFound ? '' : 'not ';
  const narcoticsStatement = `SFPD Officer searched for narcotics. Subject was ${substanceNot}found to be in possession of a controlled substance. Subject was ${paraphernaliaNot}found to be in possession of narcotics paraphernalia.`;

  const narrative = [justification, narcoticsStatement, hospitalCancellationReleaseNarrative]
    .filter(Boolean)
    .join('\n\n');

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
            <Row label="Supervising Sergeant's Star Number" value={supervisorBadgeNumber} required />
            <Row label='Agency' value={agency} required />
            <Row label='Charge' value={charge} required />

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
