/**
 * PDF generation utilities
 * Generates 647(f) Transfer Form PDF documents
 */

import { jsPDF } from 'jspdf';
import { formatDob, formatDateTime } from './dateTime.js';

/**
 * Generate a 647(f) Transfer Form PDF document
 * @param {Object} hold - Hold object containing client and hold information
 * @param {Object} facility - Optional facility object
 * @returns {jsPDF} - The generated PDF document
 */
export function generate647fTransferFormPDF (hold, facility = null) {
  if (!hold) {
    throw new Error('Hold information is required');
  }

  // eslint-disable-next-line new-cap
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPos = 20;
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;
  const labelWidth = 80;
  const valueStart = leftMargin + labelWidth;

  // Helper function to add a form field
  const addField = (label, value, required = false) => {
    const displayValue = value || 'TBD';
    const labelText = required ? `${label}*` : label;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(labelText, leftMargin, yPos);

    doc.setFont('helvetica', 'normal');
    // Handle long values by wrapping text
    const maxWidth = rightMargin - valueStart;
    const lines = doc.splitTextToSize(displayValue, maxWidth);
    doc.text(lines, valueStart, yPos);

    yPos += Math.max(7, lines.length * 5);
  };

  // Helper function to add a section header
  const addSectionHeader = (title) => {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, leftMargin, yPos);
    yPos += 8;
  };

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const titleText = '647(f) Transfer Form';
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, yPos);
  yPos += 10;

  // Draw a line under title
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, rightMargin, yPos);
  yPos += 8;

  // Subject Information Section
  addSectionHeader('Subject Information');
  doc.setFontSize(10);

  const firstName = hold.client?.firstName || 'TBD';
  const lastName = hold.client?.lastName || 'TBD';
  const middleInitial = 'TBD'; // Not available in current data model
  const race = hold.client?.race || 'TBD';
  const sex = hold.client?.sex || 'TBD';
  const dob = hold.client?.dateOfBirth ? formatDob(hold.client.dateOfBirth) : 'TBD';
  const address = 'TBD'; // Not available in current data model
  const driverLicense = 'TBD'; // Not available in current data model
  const localId = 'TBD'; // Not available in current data model

  addField('Subject Last Name:', lastName, true);
  addField('Subject First Name:', firstName, true);
  addField('Subject Middle Initial:', middleInitial, true);
  addField('Race:', race, true);
  addField('Sex:', sex, true);
  addField('Date of Birth (DOB):', dob, true);
  addField('Address:', address, false);
  addField('Driver\'s License:', driverLicense, false);
  addField('Local ID/SF #:', localId, false);

  yPos += 3;

  // Arrest Information Section
  addSectionHeader('Arrest Information');
  doc.setFontSize(10);

  const cadNumber = 'TBD'; // Not available in current data model
  const dateTimeArrested = hold.createdAt ? formatDateTime(hold.createdAt) : 'TBD';
  const transportingOfficer = hold.createdBy
    ? `${hold.createdBy.firstName} ${hold.createdBy.lastName}`
    : 'TBD';
  const locationArrested = 'TBD'; // Not available in current data model
  const unit = 'TBD'; // Not available in current data model
  const badgeNumber = 'TBD'; // Not available in current data model
  const agency = 'TBD'; // Not available in current data model
  const charge = '647(f) RWS'; // Required charge type
  const justification = hold.notes || 'TBD';

  addField('CAD Number:', cadNumber, true);
  addField('Date/Time Arrested:', dateTimeArrested, true);
  addField('Name of Transporting Officer:', transportingOfficer, true);
  addField('Location Arrested:', locationArrested, true);
  addField('Unit:', unit, true);
  addField('Badge Number/Star Number:', badgeNumber, true);
  addField('Agency:', agency, true);
  addField('Charge:', charge, true);

  yPos += 3;

  // 647(f) RWS Justification Section
  addSectionHeader('647(f) RWS Justification');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Narrative*', leftMargin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  const narrativeLines = doc.splitTextToSize(justification, rightMargin - leftMargin);
  doc.text(narrativeLines, leftMargin, yPos);
  yPos += Math.max(10, narrativeLines.length * 5);

  yPos += 5;

  // Additional Information Section
  addSectionHeader('Additional Information');
  doc.setFontSize(10);

  addField('Hold ID:', hold.id.substring(0, 8).toUpperCase(), false);
  addField('Service Type:', hold.serviceTypeName || 'TBD', false);
  addField('Beds Requested:', hold.bedsRequested?.toString() || 'TBD', false);

  if (facility) {
    addField('Facility:', facility.name || 'TBD', false);
    if (facility.addressLine1) {
      let facilityAddress = facility.addressLine1;
      if (facility.addressLine2) facilityAddress += `, ${facility.addressLine2}`;
      if (facility.city) facilityAddress += `, ${facility.city}`;
      if (facility.state) facilityAddress += `, ${facility.state}`;
      if (facility.postalCode) facilityAddress += ` ${facility.postalCode}`;
      addField('Facility Address:', facilityAddress, false);
    }
  }

  // Footer
  yPos = pageHeight - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated: ${new Date().toLocaleString()}`, leftMargin, yPos);
  doc.text('* Required field', rightMargin - doc.getTextWidth('* Required field'), yPos);

  return doc;
}

