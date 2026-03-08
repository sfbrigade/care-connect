/**
 * PDF generation utilities
 */

import { jsPDF } from 'jspdf';
import { formatDob } from './format.js';

/**
 * Format date as a readable string for Certificate of Release
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string like "December 15, 2025 at 3:45 PM"
 */
function formatDateForCertificate (date) {
  if (!date) {
    return 'TBD';
  }
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return 'TBD';
    }
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[d.getMonth()];
    const dateNum = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayH = hours % 12 || 12;
    const displayM = minutes.toString().padStart(2, '0');
    const time = `${displayH}:${displayM} ${ampm}`;
    return `${month} ${dateNum}, ${year} at ${time}`;
  } catch {
    return 'TBD';
  }
}

/**
 * Generate Certificate of Release PDF document
 * @param {Object} hold - Hold object containing client and hold information
 * @param {Object} facility - Optional facility object
 * @returns {jsPDF} - The generated PDF document
 */
export function generateCertificateOfReleasePDF (hold, facility = null) {
  if (!hold) {
    throw new Error('Hold information is required');
  }

  // eslint-disable-next-line new-cap
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;
  const leftMargin = 20;
  const centerX = pageWidth / 2;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const headerText = 'SAN FRANCISCO SHERIFF\'S DEPARTMENT CERTIFICATE OF RELEASE';
  const headerWidth = doc.getTextWidth(headerText);
  doc.text(headerText, centerX - headerWidth / 2, yPos);
  yPos += 20;

  // Get subject name and dates
  let subjectName = 'TBD';
  if (hold.client) {
    const firstName = hold.client.firstName || '';
    const lastName = hold.client.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    subjectName = fullName || firstName || lastName || 'TBD';
  }
  const custodyDateTime = hold.incident?.dateTimeArrested || hold.createdAt;
  const custodyDateStr = formatDateForCertificate(custodyDateTime);
  const releaseDateTime = hold.transferredAt || new Date();
  const releaseDateStr = formatDateForCertificate(releaseDateTime);

  // Single paragraph certificate text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const certificateText = `As required by the provisions of Penal Code Section 851.6 (as amended by Stats 1975, ch.1117), I hereby certify that the taking into custody of ${subjectName} on ${custodyDateStr} hours by the San Francisco Sheriff's Department was a detention only, not an arrest. ${subjectName} was released on ${releaseDateStr} by the San Francisco Sheriff's Department pursuant to the provisions of: paragraph (1) of subdivision (b) of Penal Code Section 849, paragraph (3) of Penal Code Section 849, Penal Code Section 849.5, and Penal Code Section 851.6 - pertinent portions of which appear on the reverse of this certificate.`;

  const certificateLines = doc.splitTextToSize(certificateText, pageWidth - 2 * leftMargin);
  doc.text(certificateLines, leftMargin, yPos);
  yPos += certificateLines.length * 5 + 4;

  // Deputy's Rank, Name & Star# line
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const deputyName = hold.createdBy
    ? `${hold.createdBy.firstName || ''} ${hold.createdBy.lastName || ''}`.trim() || 'TBD'
    : 'TBD';
  const rank = hold.createdBy?.rank || 'TBD';
  const badgeNumber = hold.createdBy?.badgeNumber || 'TBD';
  const unit = hold.createdBy?.unit || 'TBD';
  doc.text(`Deputy's Rank, Name & Star#: ${rank}, ${deputyName} #${badgeNumber}, Unit Identifier: ${unit}`, leftMargin, yPos);
  yPos += 10;

  // Add blank lines before signature line
  yPos += 10;

  // Deputy's signature line
  doc.text('Deputy\'s signature and star #: ______________________________________', leftMargin, yPos);
  yPos += 15;

  return doc;
}
