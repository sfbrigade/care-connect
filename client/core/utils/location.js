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

  // Fallback: detect from window location
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // Check subdomain
  const parts = hostname.split('.');
  const subdomain = parts.length > 1 ? parts[0].toLowerCase() : '';

  if (subdomain === 'lesc') {
    return {
      location: 'LESC',
      appType: 'lesc',
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

  // Default to DIDO
  return {
    location: 'DIDO',
    appType: 'dido',
    method: 'path',
  };
}

/**
 * Get app routes component based on location
 * @param {string} appType - App type ('dido' or 'lesc')
 * @returns {Promise} - Promise resolving to the app routes component
 */
export async function getAppRoutes (appType) {
  switch (appType) {
    case 'lesc':
      return (await import('../../apps/lesc/routes/LESCRoutes')).default;
    case 'dido':
    default:
      return (await import('../../apps/dido/routes/DIDORoutes')).default;
  }
}

