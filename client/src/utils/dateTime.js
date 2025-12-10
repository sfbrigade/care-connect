/**
 * Date and time formatting utilities
 * Shared across LESC components for consistent time display
 */

/**
 * Format time remaining until expiration
 * @param {string|Date} expiresAt - Expiration date/time
 * @returns {string} - Formatted string like "45 mins", "2h 30m", or "Expired"
 */
export function formatTimeRemaining (expiresAt) {
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - Date.now();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 0) return 'Expired';
  if (diffMins < 60) return `${diffMins} mins`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Format time until expiration with "Until" prefix
 * @param {string|Date} expiresAt - Expiration date/time
 * @returns {string} - Formatted string like "Until 3:45 PM"
 */
export function formatTimeUntil (expiresAt) {
  const expires = new Date(expiresAt);
  const displayHours = expires.getHours();
  const displayMinutes = expires.getMinutes();
  const ampm = displayHours >= 12 ? 'PM' : 'AM';
  const displayH = displayHours % 12 || 12;
  const displayM = displayMinutes.toString().padStart(2, '0');
  return `Until ${displayH}:${displayM} ${ampm}`;
}

/**
 * Format a date/time as a simple time string
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted string like "3:45 PM"
 */
export function formatTime (date) {
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayH = hours % 12 || 12;
  const displayM = minutes.toString().padStart(2, '0');
  return `${displayH}:${displayM} ${ampm}`;
}

/**
 * Format a created date as relative time or date
 * @param {string|Date} createdAt - Creation date/time
 * @returns {string} - Formatted string like "2 hours ago", "Yesterday", or "Jan 15"
 */
export function formatCreatedAt (createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // Format as date
    const month = created.toLocaleString('default', { month: 'short' });
    const day = created.getDate();
    const year = created.getFullYear();
    const isCurrentYear = year === now.getFullYear();
    return isCurrentYear ? `${month} ${day}` : `${month} ${day}, ${year}`;
  }
}

/**
 * Calculate age from date of birth
 * @param {string|Date} dateOfBirth - Date of birth
 * @returns {number|null} - Age in years, or null if dateOfBirth is invalid
 */
export function calculateAge (dateOfBirth) {
  if (!dateOfBirth) return null;
  try {
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}
