/**
 * Location Registry
 * Maps subdomains and paths to locations and app types
 * This should stay in sync with server/core/api/locations/registry.js
 */

export const LOCATIONS = {
  DIDO: {
    name: 'DIDO',
    appType: 'dido',
    subdomains: ['dido'],
    paths: ['/dido'],
  },
  LESC: {
    name: 'LESC',
    appType: 'lesc',
    subdomains: ['lesc'],
    paths: ['/lesc'],
  },
};

/**
 * Detect location from subdomain
 * @param {string} hostname - The hostname (e.g., "lesc.example.com" or "example.com")
 * @returns {string|null} - Location name or null if not found
 */
export function detectLocationFromSubdomain (hostname) {
  if (!hostname) return null;

  const parts = hostname.split('.');
  const subdomain = parts.length > 1 ? parts[0].toLowerCase() : '';

  for (const [locationName, location] of Object.entries(LOCATIONS)) {
    if (location.subdomains.includes(subdomain)) {
      return locationName;
    }
  }

  return null;
}

/**
 * Detect location from path
 * @param {string} pathname - The pathname (e.g., "/lesc/availability" or "/dido")
 * @returns {string|null} - Location name or null if not found
 */
export function detectLocationFromPath (pathname) {
  if (!pathname) return null;

  for (const [locationName, location] of Object.entries(LOCATIONS)) {
    for (const path of location.paths) {
      if (pathname === path || pathname.startsWith(path + '/')) {
        return locationName;
      }
    }
  }

  return null;
}

/**
 * Get app type for a location
 * @param {string} locationName - Location name (e.g., "DIDO", "LESC")
 * @returns {string|null} - App type or null if not found
 */
export function getAppTypeForLocation (locationName) {
  const location = LOCATIONS[locationName];
  return location ? location.appType : null;
}

