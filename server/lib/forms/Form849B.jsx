import React from 'react';

const FORM_TIMEZONE = 'America/Los_Angeles';

function formatDateTime24 (dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleString('en-US', { timeZone: FORM_TIMEZONE, month: '2-digit', day: '2-digit', year: 'numeric' });
  const time = d.toLocaleString('en-US', { timeZone: FORM_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }).replace('24:', '00:');
  return `${date} ${time}`;
}

function formatDate (dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  // Use UTC to avoid timezone shifting a date-only value
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', month: '2-digit', day: '2-digit', year: 'numeric' });
}

function titleCase (str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function Row ({ label, value }) {
  return (
    <tr>
      <td className='field-label'>{label}</td>
      <td className='field-value'>{value || ''}</td>
    </tr>
  );
}

function SectionHeader ({ title }) {
  return (
    <tr className='section-header-row'>
      <td colSpan={2} className='section-header'>{title}</td>
    </tr>
  );
}

function Header () {
  return (
    <header>
      Care<span style={{ color: '#888' }}>Connect</span>{' '}
      <span style={{ fontWeight: 'bold', color: '#bbb' }}>RESET</span>
    </header>
  );
}

function buildNarrative ({ arrestedAt, officerName, subjectFullName, arrivedAtReset, transferredAt, releaseReason }) {
  const t1 = formatDateTime24(arrestedAt) || '[date/time]';
  const officer = officerName || '[SFPD Officer name]';
  const person = subjectFullName || '[person full name]';
  const t2 = formatDateTime24(arrivedAtReset) || '[date/time]';
  const t3 = formatDateTime24(transferredAt) || '[date/time]';
  const reason = releaseReason || '[release reason]';

  return `At ${t1}, SFPD Officer ${officer} arrested ${person} because they were found to be under the influence of a controlled substance or alcohol in a public location. ${person} was brought to RESET at ${t2} and transferred to Sheriff's Office custody at ${t3}. They were subsequently released from their detention due to: ${reason}.`;
}

const tableCSS = `
  .form-849b .form-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1em;
    font-size: 9pt;
    line-height: 1.4;
  }
  .form-849b .form-table td {
    padding: 2.5pt 5pt;
    border: 0.5pt solid #bbb;
    vertical-align: top;
  }
  .form-849b .form-table .field-label {
    font-weight: bold;
    width: 185pt;
    color: #333;
    background: #f5f5f5;
  }
  .form-849b .form-table .section-header {
    font-weight: bold;
    font-size: 7.5pt;
    background: #ddd;
    padding: 2pt 5pt;
    letter-spacing: 0.4pt;
    text-transform: uppercase;
  }
  .form-849b .narrative-section {
    margin-top: 1em;
  }
  .form-849b .narrative-label {
    font-weight: bold;
    font-size: 9pt;
    margin-bottom: 3pt;
  }
  .form-849b .narrative-text {
    border: 0.5pt solid #bbb;
    padding: 6pt;
    min-height: 65pt;
    font-size: 9pt;
    line-height: 1.6;
  }
`;

export default function Form849B ({ data = {} }) {
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
      <style dangerouslySetInnerHTML={{ __html: tableCSS }} />
      <div className='page form-849b'>
        <Header />

        <h1 className='title'>SFSD PC 849(b) Report</h1>

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
            <Row label='DOB' value={formatDate(subjectDOB)} />
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
