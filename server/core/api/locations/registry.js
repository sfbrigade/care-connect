/**
 * Location Registry
 * Maps subdomains and paths to locations and app types
 */

const LOCATIONS = {
  DIDO: {
    name: 'DIDO',
    appType: 'dido',
    subdomains: ['dido', 'www', ''], // empty string means no subdomain (default)
    paths: ['/dido', '/'], // Support both /dido/* and / for backward compatibility
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
 * @param {string} host - The host header from the request (e.g., "lesc.example.com" or "example.com")
 * @returns {string|null} - Location name or null if not found
 */
export function detectLocationFromSubdomain (host) {
  if (!host) return null;

  // Extract subdomain (everything before the first dot)
  const parts = host.split('.');
  const subdomain = parts.length > 1 ? parts[0].toLowerCase() : '';

  for (const [locationName, location] of Object.entries(LOCATIONS)) {
    if (location.subdomains.includes(subdomain)) {
      return locationName;
    }
  }

  // Default to DIDO if no subdomain match
  return 'DIDO';
}

/**
 * Detect location from path
 * @param {string} pathname - The pathname from the request (e.g., "/lesc/availability" or "/")
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

  // Default to DIDO if no path match
  return 'DIDO';
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

/**
 * Detect location from request (checks both subdomain and path)
 * @param {object} request - Fastify request object
 * @returns {object} - { location: string, appType: string, method: 'subdomain' | 'path' }
 */
export function detectLocation (request) {
  const host = request.headers.host || '';
  const pathname = request.urlData('path') || request.url.split('?')[0];

  // First try subdomain detection
  const subdomainLocation = detectLocationFromSubdomain(host);
  if (subdomainLocation && subdomainLocation !== 'DIDO') {
    return {
      location: subdomainLocation,
      appType: getAppTypeForLocation(subdomainLocation),
      method: 'subdomain',
    };
  }

  // Then try path detection
  const pathLocation = detectLocationFromPath(pathname);
  return {
    location: pathLocation || 'DIDO',
    appType: getAppTypeForLocation(pathLocation || 'DIDO'),
    method: 'path',
  };
}

export default {
  LOCATIONS,
  detectLocationFromSubdomain,
  detectLocationFromPath,
  getAppTypeForLocation,
  detectLocation,
};

