import { isEmail } from '../../utils/email';
const emailValidator = isEmail('Please enter a valid email address.');

function parseCsvLine (line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function parseCsv (text, expectedHeaders) {
  const allLines = text.split(/\r?\n/);
  const errors = [];
  const rows = [];

  if (!Array.isArray(expectedHeaders) || expectedHeaders.length === 0) {
    errors.push('Expected headers are required.');
    return { rows, errors };
  }

  const headerLine = allLines.find((line) => line.trim() !== '');
  if (!headerLine) {
    errors.push('CSV file is empty.');
    return { rows, errors };
  }

  const headerValues = parseCsvLine(headerLine).map((value) => value.trim().toLowerCase());
  if (headerValues.length !== expectedHeaders.length ||
    headerValues.some((value, index) => value !== expectedHeaders[index])) {
    errors.push(`Invalid header row. Expected: ${expectedHeaders.join(', ')}.`);
    return { rows, errors };
  }

  let headerSeen = false;
  for (let lineIndex = 0; lineIndex < allLines.length; lineIndex += 1) {
    const rawLine = allLines[lineIndex];
    if (rawLine.trim() === '') {
      continue;
    }
    if (!headerSeen) {
      headerSeen = true;
      continue;
    }
    const lineNumber = lineIndex + 1;
    const values = parseCsvLine(rawLine);
    if (values.length !== expectedHeaders.length) {
      errors.push(`Row ${lineNumber}: Expected ${expectedHeaders.length} columns.`);
      continue;
    }
    const firstName = values[0].trim();
    const lastName = values[1].trim();
    const email = values[2].trim();
    if (!firstName) {
      errors.push(`Row ${lineNumber}: First name is required. (email: ${email})`);
      continue;
    }
    if (!lastName) {
      errors.push(`Row ${lineNumber}: Last name is required. (email: ${email})`);
      continue;
    }
    if (!email) {
      errors.push(`Row ${lineNumber}: Email is required.`);
      continue;
    }
    const emailError = emailValidator(email);
    if (emailError) {
      errors.push(`Row ${lineNumber}: ${emailError} (email: ${email})`);
      continue;
    }
    rows.push({ firstName, lastName, email });
  }

  return { rows, errors };
}

export { parseCsv, parseCsvLine };
