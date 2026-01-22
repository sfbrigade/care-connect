import { describe, expect, it } from 'vitest';

import { parseCsv, parseCsvLine } from './util';

const EXPECTED_HEADERS = ['first_name', 'last_name', 'email'];

describe('parseCsvLine', () => {
  it('splits comma-separated values', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('preserves commas inside quoted values', () => {
    expect(parseCsvLine('"a,b",c')).toEqual(['a,b', 'c']);
  });

  it('handles escaped quotes inside quoted values', () => {
    expect(parseCsvLine('"a ""quote"" here",b')).toEqual(['a "quote" here', 'b']);
  });
});

describe('parseCsv', () => {
  it('returns an error when headers are missing', () => {
    const { rows, errors } = parseCsv('first_name,last_name,email\nJohn,Doe,john@example.com');
    expect(rows).toEqual([]);
    expect(errors).toEqual(['Expected headers are required.']);
  });

  it('returns an error for empty files', () => {
    const { rows, errors } = parseCsv('', EXPECTED_HEADERS);
    expect(rows).toEqual([]);
    expect(errors).toEqual(['CSV file is empty.']);
  });

  it('validates the header row', () => {
    const { rows, errors } = parseCsv('first,last,email\nJohn,Doe,john@example.com', EXPECTED_HEADERS);
    expect(rows).toEqual([]);
    expect(errors[0]).toContain('Invalid header row.');
  });

  it('parses valid rows', () => {
    const csv = [
      'first_name, last_name, email',
      'John, Doe, john@example.com',
      '"Jane", "Smith", jane.smith@example.com',
    ].join('\n');

    const { rows, errors } = parseCsv(csv, EXPECTED_HEADERS);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com' },
    ]);
  });

  it('returns row-level errors for missing fields', () => {
    const csv = [
      'first_name,last_name,email',
      'John,,john@example.com',
      ',Doe,jane@example.com',
    ].join('\n');

    const { rows, errors } = parseCsv(csv, EXPECTED_HEADERS);
    expect(rows).toEqual([]);
    expect(errors).toEqual([
      'Row 2: Last name is required. (email: john@example.com)',
      'Row 3: First name is required. (email: jane@example.com)',
    ]);
  });

  it('returns row-level errors for invalid emails', () => {
    const csv = [
      'first_name,last_name,email',
      'John,Doe,not-an-email',
    ].join('\n');

    const { rows, errors } = parseCsv(csv, EXPECTED_HEADERS);
    expect(rows).toEqual([]);
    expect(errors[0]).toContain('Row 2:');
    expect(errors[0]).toContain('not-an-email');
  });
});
