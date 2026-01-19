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
 * @returns {string} - Formatted string like "0:45", "2:30", or "Expired"
 */
export function formatTimeRemaining (expiresAt) {
  const expires = dateTime(expiresAt);
  const now = DateTime.now();

  if (expires < now) return 'Expired';

  return expires.diff(now, ['hours', 'minutes']).toFormat('h:mm');
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
  return -Math.floor(dateTime(dateOfBirth).diffNow('years').years);
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
 * Format date and time as MM/DD/YYYY HH:MM AM/PM
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted string like "12/25/1990 3:45 PM" or "TBD" if invalid
 */
export function formatDateTime (date) {
  if (!date) return 'TBD';
  return dateTime(date).toLocaleString(DateTime.DATETIME_SHORT);
}
