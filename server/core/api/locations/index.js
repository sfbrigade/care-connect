import fp from 'fastify-plugin';
import { detectLocation } from './registry.js';

/**
 * Location detection plugin
 * Adds location and appType to the request object based on subdomain or path
 */
export default fp(async function (fastify) {
  // Add location detection hook
  fastify.addHook('onRequest', async (request) => {
    const locationInfo = detectLocation(request);
    if (locationInfo) {
      request.location = locationInfo.location;
      request.appType = locationInfo.appType;
      request.locationMethod = locationInfo.method;
    } else {
      // No location found - set to null (will result in 404)
      request.location = null;
      request.appType = null;
      request.locationMethod = null;
    }
  });

  // Decorate request with location info getter
  fastify.decorateRequest('getLocation', function () {
    return {
      location: this.location,
      appType: this.appType,
      method: this.locationMethod,
    };
  });
});

