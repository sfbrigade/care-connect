/**
 * PDF generation utilities
 * Generates 647(f) Transfer Form PDF documents
 */

import { jsPDF } from 'jspdf';
import { PDFDocument, PDFString, PDFName } from 'pdf-lib';
import { formatDob, formatDateTime } from './format.js';

// Path to the SFSO Form P04 PDF template
const SFSO_FORM_P04_PATH = '/static-data/forms/SFSO-FORM-P04-INVESTIGATIVE-DETENTION-REPORT.pdf';

/**
 * Generate a 647(f) Transfer Form PDF document
 * @param {Object} hold - Hold object containing client and hold information
 * @param {Object} facility - Optional facility object
 * @returns {jsPDF} - The generated PDF document
 */
export function generate647fTransferFormPDF(hold, facility = null) {
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
  const middleInitial = hold.client?.middleInitial || 'TBD';
  const race = hold.client?.race || 'TBD';
  const sex = hold.client?.sex || 'TBD';
  const dob = hold.client?.dateOfBirth ? formatDob(hold.client.dateOfBirth) : 'TBD';
  const address = hold.client?.address || 'TBD';
  const driverLicense = hold.client?.driverLicense || 'TBD';
  const localId = hold.client?.localId || 'TBD';

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

  // Use incident data when available, fallback to TBD or existing logic
  const cadNumber = hold.incident?.cadNumber || 'TBD';
  const dateTimeArrested = hold.incident?.dateTimeArrested
    ? formatDateTime(hold.incident.dateTimeArrested)
    : (hold.createdAt ? formatDateTime(hold.createdAt) : 'TBD');
  const transportingOfficer = hold.createdBy
    ? `${hold.createdBy.firstName} ${hold.createdBy.lastName}`
    : 'TBD';
  const locationArrested = hold.incident?.locationArrested || 'TBD';
  const unit = hold.createdBy?.unit || 'TBD';
  const badgeNumber = hold.incident?.badgeNumber || 'TBD';
  const agency = hold.incident?.agency || 'TBD';
  const charge = hold.incident?.charge || '647(f) RWS';
  const justification = hold.notes || 'TBD';
  const substanceNot = hold.narcoticsSubstance === true ? '' : 'not ';
  const paraphernaliaNot = hold.narcoticsParaphernalia === true ? '' : 'not ';
  const narcoticsStatement = `SFPD Officer searched for narcotics. Subject was ${substanceNot} found to be in possession of a controlled substance. Subject was ${paraphernaliaNot} found to be in possession of narcotics paraphernalia.`;

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
  const narrativeText = `${justification}\n\n${narcoticsStatement}`;
  const narrativeLines = doc.splitTextToSize(narrativeText, rightMargin - leftMargin);
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

/**
 * Format date as a readable string for Certificate of Release
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string like "December 15, 2025 at 3:45 PM"
 */
function formatDateForCertificate(date) {
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
export function generateCertificateOfReleasePDF(hold, facility = null) {
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

/**
 * Analyze PDF form and create mapping from labels to field names
 * This function loads the PDF form, extracts all fields and text,
 * and attempts to match labels to form fields based on proximity
 *
 * @param {string} pdfPath - Path to the PDF form file
 * @returns {Promise<Object>} Mapping object with label -> fieldName pairs
 */
export async function analyzePDFFormMapping(pdfPath) {
  try {
    // Fetch the PDF file
    const response = await fetch(pdfPath);
    const pdfBytes = await response.arrayBuffer();

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // Get all form fields
    const fields = form.getFields();
    const fieldInfo = fields.map((field, index) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;

      // Try to get field position (if available)
      let position = null;
      try {
        // Some fields have getRectangle() method
        if (typeof field.getRectangle === 'function') {
          const rect = field.getRectangle();
          position = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          };
        }
      } catch (e) {
        // Position not available
      }

      return {
        index: index + 1,
        name: fieldName,
        type: fieldType,
        position
      };
    });

    // Create a mapping based on field names and common patterns
    const mapping = {};

    // Known field name patterns and their likely labels
    const fieldNamePatterns = {
      // Reporting/Deputy fields
      REPORTING: 'Reporting Deputy',
      REPORTING_UNIT: 'Reporting Unit',
      ASSIGNED_BY: 'Assigned By',

      // Subject information
      NAME_LAST_FIRST_MIDDLE: 'Name (Last, First, Middle)',
      RACE: 'Race',
      SEX: 'Sex',
      DOBAGE: 'Date of Birth / Age',
      ALIAS: 'Alias',
      HEIGHT: 'Height',
      WEIGHT: 'Weight',
      HAIR: 'Hair',
      EYES: 'Eyes',
      RESIDENCE_ADDRESS: 'Residence Address',
      ZIP_CODE: 'Zip Code',
      CONTACT_PHONE: 'Contact Phone',
      ID_NO: 'ID Number',
      SF_NO: 'SF Number',

      // Incident information
      DATETIME_OF_OCCURRENCE: 'Date/Time of Occurrence',
      LOCATION_OF_OCCURRENCE: 'Location of Occurrence',
      NARRATIVE: 'Narrative',
      OTHER_INFORMATION: 'Other Information',

      // Review/Approval
      REPORT_REVIEWED_BY: 'Report Reviewed By',
      WATCH_COMMANDER_APPROVAL: 'Watch Commander Approval',

      // Search information
      SUBJECT_HANDCUFFED: 'Subject Handcuffed',
      WEAPONS_SEARCH: 'Weapons Search',
      PROBATION_SEARCH: 'Probation Search',
      PAROLE_SEARCH: 'Parole Search',
      OTHER_SEARCH: 'Other Search',
      PROBATION: 'Probation',
      PAROLE: 'Parole',
      OTHER: 'Other',
      NONE: 'None',

      // Generic text fields (will need manual mapping)
      Textfield: 'Reporting Deputy', // Most likely candidate
      Textfield0: 'Reporting Deputy (alternate)', // Second candidate
      Text1: 'Text Field 1',
      Text2: 'Text Field 2',
      Text3: 'Text Field 3',
      Text4: 'Text Field 4',
      Text5: 'Text Field 5',
    };

    // Build mapping from field names
    fieldInfo.forEach(field => {
      const fieldName = field.name;

      // Check for exact matches in patterns
      for (const [pattern, label] of Object.entries(fieldNamePatterns)) {
        if (fieldName.includes(pattern) || fieldName === pattern) {
          mapping[label] = fieldName;
          break;
        }
      }

      // If no pattern match, add to unmapped fields
      if (!Object.values(mapping).includes(fieldName)) {
        mapping[`[UNMAPPED] ${fieldName}`] = fieldName;
      }
    });

    return {
      fields: fieldInfo,
      mapping,
      summary: {
        totalFields: fields.length,
        mappedFields: Object.keys(mapping).filter(k => !k.startsWith('[UNMAPPED]')).length,
        unmappedFields: Object.keys(mapping).filter(k => k.startsWith('[UNMAPPED]')).length
      }
    };
  } catch (error) {
    console.error('Error analyzing PDF form:', error);
    throw error;
  }
}

/**
 * Analyze the SFSO Form P04 and log field mappings to console
 * Call this from browser console: await analyzeSFSOForm()
 */
export async function analyzeSFSOForm() {
  try {
    const result = await analyzePDFFormMapping(SFSO_FORM_P04_PATH);

    console.log('=== PDF Form Analysis ===');
    console.log(`Total Fields: ${result.summary.totalFields}`);
    console.log(`Mapped Fields: ${result.summary.mappedFields}`);
    console.log(`Unmapped Fields: ${result.summary.unmappedFields}`);
    console.log('\n=== All Fields ===');

    result.fields.forEach(field => {
      console.log(`${field.index}. ${field.name} (${field.type})`);
      if (field.position) {
        console.log(`   Position: x=${field.position.x}, y=${field.position.y}`);
      }
    });

    console.log('\n=== Field Mapping ===');
    Object.entries(result.mapping).forEach(([label, fieldName]) => {
      console.log(`${label} -> ${fieldName}`);
    });

    console.log('\n=== Unmapped Fields (need manual mapping) ===');
    Object.entries(result.mapping)
      .filter(([label]) => label.startsWith('[UNMAPPED]'))
      .forEach(([label, fieldName]) => {
        console.log(`${fieldName} - needs label assignment`);
      });

    return result;
  } catch (error) {
    console.error('Error analyzing form:', error);
    throw error;
  }
}

/**
 * Debug function: Fill SFSO Form P04 PDF with field numbers and names
 * This is helpful for identifying which field name corresponds to which position on the form
 * @returns {Promise<Uint8Array>} - Filled PDF as bytes
 */
export async function fillSFSOFormP04Debug() {
  // Load the PDF form
  const response = await fetch(SFSO_FORM_P04_PATH);
  const pdfBytes = await response.arrayBuffer();

  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // Get all form fields
  const fields = form.getFields();
  let fieldCounter = 1;

  console.log(`Found ${fields.length} total fields`);

  // Fill each field with a unique ascending 4-digit integer and field name
  fields.forEach((field) => {
    try {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;

      // Check if field has setText method (text fields) or select method (dropdowns)
      const isTextField = typeof field.setText === 'function';
      const isDropdown = typeof field.select === 'function';

      console.log(`${fieldCounter}. ${fieldName} (${fieldType}) - isTextField: ${isTextField}, isDropdown: ${isDropdown}`);

      if (isTextField || isDropdown) {
        const number = String(fieldCounter).padStart(4, '0');
        const value = `${number}: ${fieldName}`;

        if (isTextField) {
          field.setText(value);
          console.log(`  ✓ Set text field "${fieldName}" to "${value}"`);
        } else if (isDropdown) {
          try {
            // Try to select the value
            field.select(value);
            console.log(`  ✓ Set dropdown "${fieldName}" to "${value}"`);
          } catch (e) {
            // If that fails, try to set it as text if it's editable
            try {
              if (typeof field.setText === 'function') {
                field.setText(value);
                console.log(`  ✓ Set dropdown "${fieldName}" as text to "${value}"`);
              } else {
                console.log(`  ✗ Could not set dropdown "${fieldName}": ${e.message}`);
              }
            } catch (e2) {
              console.log(`  ✗ Could not set dropdown "${fieldName}": ${e2.message}`);
            }
          }
        }

        fieldCounter++;
      } else {
        console.log(`  - Skipping field "${fieldName}" (not a text field or dropdown)`);
      }
    } catch (error) {
      // Field might not be accessible or wrong type
      console.error('Error processing field:', error);
    }
  });

  console.log(`\nProcessed ${fieldCounter - 1} fillable fields`);

  // Save the PDF
  const pdfBytesOut = await pdfDoc.save();
  return pdfBytesOut;
}

/**
 * Fill the SFSO Form P04 PDF with hold data
 * @param {Object} hold - Hold object containing client and hold information
 * @param {Object} facility - Optional facility object
 * @param {Object} currentUser - Current user (for reporting deputy)
 * @returns {Promise<Uint8Array>} - Filled PDF as bytes
 */
export async function fillSFSOFormP04(hold, facility = null, currentUser = null) {
  if (!hold) {
    throw new Error('Hold information is required');
  }

  // Load the PDF form
  const response = await fetch(SFSO_FORM_P04_PATH);

  // Check if the response is OK
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF form: ${response.status} ${response.statusText}. Path: ${SFSO_FORM_P04_PATH}`);
  }

  // Check if the response is actually a PDF
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
    throw new Error(`Expected PDF but got ${contentType} from ${SFSO_FORM_P04_PATH}. The file may not be deployed correctly.`);
  }

  const pdfBytes = await response.arrayBuffer();

  // Verify it's actually a PDF by checking the header
  const uint8Array = new Uint8Array(pdfBytes);
  if (uint8Array.length < 4) {
    throw new Error(`Invalid PDF file: file is too short. The file at ${SFSO_FORM_P04_PATH} may be corrupted.`);
  }
  const header = String.fromCharCode(...uint8Array.slice(0, 4));
  if (header !== '%PDF') {
    // Check if it's HTML (common 404 response)
    const textStart = String.fromCharCode(...uint8Array.slice(0, Math.min(100, uint8Array.length)));
    if (textStart.includes('<!DOCTYPE') || textStart.includes('<html')) {
      throw new Error(`PDF form not found at ${SFSO_FORM_P04_PATH}. The file may not be deployed or the path is incorrect. Received HTML instead of PDF.`);
    }
    throw new Error(`Invalid PDF file: expected PDF header but got "${header}". The file at ${SFSO_FORM_P04_PATH} may be corrupted or not a valid PDF.`);
  }

  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // Embed Courier font for typewriter appearance
  const courierFont = pdfDoc.embedStandardFont('Courier');

  // Helper to safely set field value
  const setFieldValue = (fieldName, value) => {
    try {
      const field = form.getTextField(fieldName);
      if (field && typeof field.setText === 'function') {
        field.setText(String(value || ''));
        return true;
      }
    } catch (error) {
      // Try as dropdown
      try {
        const dropdown = form.getDropdown(fieldName);
        if (dropdown && typeof dropdown.select === 'function') {
          dropdown.select(String(value || ''));
          return true;
        }
      } catch (e2) {
        // Field might not exist or might be wrong type
        console.warn(`Could not set field ${fieldName}:`, error.message);
      }
    }
    return false;
  };

  // Map hold data to form fields
  const substanceNot = hold.narcoticsSubstance === true ? '' : 'not ';
  const paraphernaliaNot = hold.narcoticsParaphernalia === true ? '' : 'not ';
  const narcoticsStatement = `SFPD Officer searched for narcotics. Subject was ${substanceNot}found to be in possession of a controlled substance. Subject was ${paraphernaliaNot}found to be in possession of narcotics paraphernalia.`;

  const fieldMappings = {
    // Reporting Deputy - map to hold creator
    Text3: hold.createdBy
      ? `${hold.createdBy.firstName} ${hold.createdBy.lastName}`.trim()
      : 'TBD',
    // Badge Number/Star Number
    Text4: hold.incident?.badgeNumber || 'TBD',

    // Subject Information
    NAME_LAST_FIRST_MIDDLE: hold.client
      ? `${hold.client.lastName || ''}, ${hold.client.firstName || ''}`.trim() || 'TBD'
      : 'TBD',
    RACE: hold.client?.race || 'TBD',
    SEX: hold.client?.sex || 'TBD',
    DOBAGE: hold.client?.dateOfBirth ? formatDob(hold.client.dateOfBirth) : 'TBD',
    ALIAS: 'TBD', // Not available
    HEIGHT: 'TBD', // Not available
    WEIGHT: 'TBD', // Not available
    HAIR: 'TBD', // Not available
    EYES: 'TBD', // Not available
    RESIDENCE_ADDRESSCITY_IF_NOT_SAN_FRANCISCO: 'TBD', // Not available
    ZIP_CODE: 'TBD', // Not available
    CONTACT_PHONE: 'TBD', // Not available
    ID_NO_SOCSECOPLICFBICII: 'TBD', // Not available
    SF_NOXNO: hold.id.substring(0, 8).toUpperCase(),

    // Incident Information
    // Use incident data when available, fallback to hold.createdAt or 'TBD'
    DATETIME_OF_OCCURRENCE: hold.incident?.dateTimeArrested
      ? formatDateTime(hold.incident.dateTimeArrested)
      : (hold.createdAt ? formatDateTime(hold.createdAt) : 'TBD'),
    LOCATION_OF_OCCURRENCE: hold.incident?.locationArrested || 'TBD',
    REPORTING_UNIT: hold.incident?.unit || 'TBD',
    NARRATIVE: `${hold.notes || 'TBD'}\n\n${narcoticsStatement}`,
    OTHER_INFORMATION: 'TBD', // Not available

    // Review/Approval (leave empty for now)
    REPORT_REVIEWED_BY_PRINTNAMESTAR: '',
    WATCH_COMMANDER_APPROVAL_PRINT_NAMESTAR: '',
    ASSIGNED_BY_PRINTNAME: '',
    COPIES_TO_OUTSIDE_AGENCIES_NAME_OF_UNITS: '',
  };

  // Fill all mapped fields
  Object.entries(fieldMappings).forEach(([fieldName, value]) => {
    setFieldValue(fieldName, value);
  });

  // Update all form field appearances to use Courier font
  // This will make all filled values appear in typewriter font
  try {
    form.updateFieldAppearances(courierFont);
  } catch (fontError) {
    console.warn('Could not update field appearances with Courier font:', fontError.message);
  }

  // Specifically set narrative field to 12pt font size
  // Set the default appearance (DA) string before updating appearances
  try {
    const narrativeField = form.getTextField('NARRATIVE');
    if (narrativeField && narrativeField.acroField && narrativeField.acroField.dict) {
      // Set DA (Default Appearance) string: "/Courier 12 Tf 0 0 0 rg"
      // This sets Courier font at 12pt with black color
      const daString = '/Courier 12 Tf 0 0 0 rg';
      // Create PDF string object
      const daValue = PDFString.of(daString);
      // Use PDFName for the dictionary key
      const daKey = PDFName.of('DA');
      narrativeField.acroField.dict.set(daKey, daValue);
      // Update appearances to apply the new font and size
      narrativeField.updateAppearances(courierFont);
    }
  } catch (narrativeError) {
    // If setting font size fails, continue without it - field will use form's default size
    console.warn('Could not set narrative field to 12pt:', narrativeError.message);
  }

  // Save the PDF
  const pdfBytesOut = await pdfDoc.save();
  return pdfBytesOut;
}
