import { metadata } from './metadata.js';

function transformData (deflection) {
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
}

export async function generatePdf (deflection) {
  const formData = transformData(deflection);
  const { default: Form647f } = await import('#lib/forms/dist/Form647f.js');
  const { renderFormToHtml, renderToPdf } = await import('#lib/forms/shared/pdf.js');
  const html = await renderFormToHtml(Form647f, formData, { title: metadata.title });
  return Buffer.from(await renderToPdf(html));
}
