import { DateTime } from 'luxon';

/**
 * Formatting utilities
 */

export function formatAddress ({ addressLine1, addressLine2, city, state, postalCode }) {
  return `${addressLine1 ?? ''}${addressLine2 ? `, ${addressLine2}` : ''}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${postalCode ? ` ${postalCode}` : ''}`;
}

/**
 * Convert date to DateTime object
 * @param {string|Date} date - Date to convert
 * @returns {DateTime} - DateTime object
 */
function dateTime (date) {
  return typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
}

/**
 * Format time remaining until expiration
 * @param {string|Date} expiresAt - Expiration date/time
 * @returns {string} - Formatted string like "45:00", "60:00", or "Expired"
 */
export function formatTimeRemaining (expiresAt, now = DateTime.now()) {
  const expires = dateTime(expiresAt);

  if (expires < now) return 'Expired';

  return expires.diff(now, ['minutes', 'seconds']).toFormat('m:ss');
}

/**
 * Format time until expiration with "Until" prefix
 * @param {string|Date} expiresAt - Expiration date/time
 * @returns {string} - Formatted string like "Until 3:45 PM"
 */
export function formatTimeUntil (expiresAt) {
  return `Until ${formatTime(expiresAt)}`;
}

/**
 * Format a date/time as a simple time string
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted string like "3:45 PM"
 */
export function formatTime (date) {
  return dateTime(date).toLocaleString(DateTime.TIME_SIMPLE);
}

/**
 * Format a created date as relative time or date
 * @param {string|Date} createdAt - Creation date/time
 * @returns {string} - Formatted string like "2 hours ago", "Yesterday", or "Jan 15"
 */
export function formatCreatedAt (createdAt) {
  return dateTime(createdAt).toRelative();
}

/**
 * Calculate age from date of birth
 * @param {string|Date} dateOfBirth - Date of birth
 * @returns {number|null} - Age in years, or null if dateOfBirth is invalid
 */
export function calculateAge (dateOfBirth) {
  if (!dateOfBirth) return null;
  return -Math.trunc(dateTime(dateOfBirth).diffNow('years').years);
}

/**
 * Format date of birth as MM/DD/YYYY
 * @param {string|Date} dateOfBirth - Date of birth
 * @returns {string|null} - Formatted string like "12/25/1990" or null if invalid
 */
export function formatDob (dateOfBirth) {
  if (!dateOfBirth) return null;
  return dateTime(dateOfBirth).toLocaleString(DateTime.DATE_SHORT);
}

/**
 * Format up to 8 digits as MM/DD/YYYY with slashes after 2 and 4 digits.
 * @param {string} value - Date of birth
 * @returns {string} - Formatted string like "12/25/1990" or null if invalid
 */
export function formatInputDob (value) {
  if (!value) return '';
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Format date and time as MM/DD/YYYY HH:MM AM/PM
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted string like "12/25/1990 3:45 PM" or "TBD" if invalid
 */
export function formatDateTime (date) {
  if (!date) return 'TBD';
  return dateTime(date).toLocaleString(DateTime.DATETIME_SHORT);
}
