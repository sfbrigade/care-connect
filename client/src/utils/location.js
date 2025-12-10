/**
 * Location utilities for frontend
 * Detects and manages location/app routing
 */

/**
 * Get location from static context or window location
 * @param {object} staticContext - Static context from server
 * @returns {object} - { location: string, appType: string, method: string }
 */
export function getLocation (staticContext) {
  // First try static context (from server-side rendering)
  if (staticContext?.location) {
    return {
      location: staticContext.location.name,
      appType: staticContext.location.appType,
      method: staticContext.location.method,
    };
  }

  // Fallback: detect from window location (only in browser)
  if (typeof window === 'undefined') {
    // Server-side rendering - no window object, return null
    return null;
  }

  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // Check subdomain
  const parts = hostname.split('.');
  const subdomain = parts.length > 1 ? parts[0].toLowerCase() : '';

  // Check for LESC subdomain
  if (subdomain === 'lesc') {
    return {
      location: 'LESC',
      appType: 'lesc',
      method: 'subdomain',
    };
  }

  // Check for DIDO subdomain (only 'dido', not 'www' or empty)
  if (subdomain === 'dido') {
    return {
      location: 'DIDO',
      appType: 'dido',
      method: 'subdomain',
    };
  }

  // Check path
  if (pathname.startsWith('/lesc')) {
    return {
      location: 'LESC',
      appType: 'lesc',
      method: 'path',
    };
  }

  // Check for DIDO path
  if (pathname.startsWith('/dido')) {
    return {
      location: 'DIDO',
      appType: 'dido',
      method: 'path',
    };
  }

  // No location found - return null (will result in 404)
  return null;
}

/**
 * Get app routes component based on location
 * @param {string} appType - App type ('dido' or 'lesc')
 * @returns {Promise} - Promise resolving to the app routes component
 */
export async function getAppRoutes (appType) {
  switch (appType) {
    case 'lesc':
      return (await import('../lesc/routes/LESCRoutes')).default;
    case 'dido':
    default:
      return (await import('../dido/routes/DIDORoutes')).default;
  }
}
