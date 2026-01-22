import Api from '@/Api';

/**
 * Get current location using browser Geolocation API
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export function getCurrentLocation () {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Reverse geocode coordinates to address using backend API
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object|null>} Address object or null if geocoding fails
 */
export async function reverseGeocode (latitude, longitude) {
  try {
    const response = await Api.geocode.reverse(latitude, longitude);
    return response.data;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

/**
 * Get current location and reverse geocode to address
 * @returns {Promise<Object|null>} Address object or null if any step fails
 */
export async function getCurrentLocationAddress () {
  try {
    const location = await getCurrentLocation();
    const address = await reverseGeocode(location.latitude, location.longitude);
    return address;
  } catch (error) {
    console.error('Failed to get current location address:', error);
    return null;
  }
}
