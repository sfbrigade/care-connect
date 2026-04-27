import React from 'react';
import { FORM_TIMEZONE, formatDateTime24, formatDateOnly, titleCase, joinWords } from '../shared/formUtils.js';
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
    arrestedAt = null,
    arrestLocation = '',
    charge = '',
    cadNumber = '',
    arrestingOfficerRank = '',
    arrestingOfficerName = '',
    arrestingOfficerBadge = '',
    arrestingOfficerUnit = '',
    arrestingOfficerAgency = '',
    supervisorBadgeNumber = '',
    custodyReleaseOfficerRank = '',
    custodyReleaseOfficerName = '',
    custodyReleaseOfficerBadge = '',
    justification = '',
    hospitalCancellationReleaseNarrative = '',
    substanceFound = false,
    paraphernaliaFound = false,
    deflectionId = '',
    facilityName = '',
    facilityAddress = '',
  } = data;

  const arrestingOfficerDisplay = joinWords(arrestingOfficerRank, arrestingOfficerName, arrestingOfficerBadge && `#${arrestingOfficerBadge}`);
  const custodyReleaseOfficerDisplay = joinWords(custodyReleaseOfficerRank, custodyReleaseOfficerName, custodyReleaseOfficerBadge && `#${custodyReleaseOfficerBadge}`);
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
            <Row label='Subject Last Name' value={subjectLastName} />
            <Row label='Subject First Name' value={subjectFirstName} />
            <Row label='Subject Middle Initial' value={subjectMiddleInitial} />
            <Row label='Race' value={titleCase(subjectRace)} />
            <Row label='Sex' value={titleCase(subjectSex)} />
            <Row label='Date of Birth (DOB)' value={formatDateOnly(subjectDOB)} />
            <Row label='Address' value={subjectAddress} />
            <Row label="Driver's License" value={subjectDL} />
            <Row label='Local ID / SF #' value={subjectLocalId} />

            <SectionHeader title='Arrest Information' />
            <Row label='Date/Time Arrested' value={formatDateTime24(arrestedAt)} />
            <Row label='Location Arrested' value={arrestLocation} />
            <Row label='Charge' value={charge || '647(f) RWS'} />
            <Row label='CAD Number' value={cadNumber} />

            <SectionHeader title='Officer Information' />
            <Row label='Arresting Officer' value={arrestingOfficerDisplay} />
            <Row label='Unit' value={arrestingOfficerUnit} />
            <Row label='Agency' value={arrestingOfficerAgency} />
            <Row label="Supervising Sergeant's Star Number" value={supervisorBadgeNumber} />
            <Row label='Officer Present at Custody Transfer' value={custodyReleaseOfficerDisplay} />

            <SectionHeader title='Additional Information' />
            <Row label='Hold ID' value={String(deflectionId)} />
            {facilityName && <Row label='Facility' value={facilityName} />}
            {facilityAddress && <Row label='Facility Address' value={facilityAddress} />}
          </tbody>
        </table>

        <div className='narrative-section'>
          <div className='narrative-label'>
            647(f) RWS Justification / Narrative
          </div>
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
