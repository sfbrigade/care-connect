import { GeoPlacesClient, SuggestCommand, ReverseGeocodeCommand, GeocodeCommand } from '@aws-sdk/client-geo-places';
import { GeoRoutesClient, CalculateRoutesCommand } from '@aws-sdk/client-geo-routes';

// AWS GeoPlaces client for address autocomplete, reverse geocoding, and forward geocoding.
// Requires an IAM user with "geo-places:Suggest", "geo-places:ReverseGeocode",
// and "geo-places:Geocode" permissions.
// Set AWS_LOCATION_ACCESS_KEY_ID and AWS_LOCATION_SECRET_ACCESS_KEY in .env.

// SF bounding box: [west, south, east, north]
const SF_BOUNDING_BOX = [-122.5155, 37.7080, -122.3570, 37.8120];

let client;
let routeClient;

function credentials () {
  return {
    accessKeyId: process.env.AWS_LOCATION_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_LOCATION_SECRET_ACCESS_KEY,
  };
}

function init () {
  if (!client) {
    client = new GeoPlacesClient({
      credentials: credentials(),
      region: process.env.AWS_LOCATION_REGION ?? 'us-west-2',
    });
  }
}

function initRoutes () {
  if (!routeClient) {
    // Reuses the AWS_LOCATION_* creds; the IAM user needs "geo-routes:CalculateRoutes".
    routeClient = new GeoRoutesClient({
      credentials: credentials(),
      region: process.env.AWS_LOCATION_REGION ?? 'us-west-2',
    });
  }
}

// Calculate drive-time in seconds from origin → destination
const ROUTE_TIMEOUT_MS = 3000;
async function calculateRouteDuration (origin, destination) {
  initRoutes();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROUTE_TIMEOUT_MS);
  try {
    const response = await routeClient.send(
      new CalculateRoutesCommand({
        Origin: [origin.lng, origin.lat],
        Destination: [destination.lng, destination.lat],
        TravelMode: 'Car',
      }),
      { abortSignal: controller.signal }
    );
    return response?.Routes?.[0]?.Summary?.Duration ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function suggest (text) {
  init();
  const command = new SuggestCommand({
    QueryText: text,
    MaxResults: 5,
    AdditionalFeatures: ['Core'],
    Filter: {
      BoundingBox: SF_BOUNDING_BOX,
      IncludeCountries: ['USA'],
    },
    Language: 'en',
    IntendedUse: 'SingleUse',
  });
  return client.send(command);
}

async function reverseGeocode (latitude, longitude) {
  init();
  const command = new ReverseGeocodeCommand({
    QueryPosition: [longitude, latitude],
    MaxResults: 1,
    Language: 'en',
    IntendedUse: 'SingleUse',
  });
  const response = await client.send(command);
  const result = response.ResultItems?.[0];
  if (!result) return null;

  const address = result.Address;
  const streetAddress = buildAddressLine1(address);

  return {
    addressLine1: streetAddress || address?.Label || null,
    city: address?.Locality || null,
    state: address?.Region?.Code || null,
    postalCode: address?.PostalCode || null,
    neighborhood: address?.District || null,
  };
}

async function geocode (text) {
  init();
  const command = new GeocodeCommand({
    QueryText: text,
    MaxResults: 1,
    Filter: {
      BoundingBox: SF_BOUNDING_BOX,
      IncludeCountries: ['USA'],
    },
    Language: 'en',
    IntendedUse: 'SingleUse',
  });
  const response = await client.send(command);
  const result = response.ResultItems?.[0];
  if (!result?.Position) return null;

  return {
    lat: result.Position[1],
    lng: result.Position[0],
  };
}

function buildAddressLine1 (address) {
  return [address?.AddressNumber, address?.Street].filter(Boolean).join(' ');
}

export default {
  suggest,
  reverseGeocode,
  geocode,
  calculateRouteDuration,
  buildAddressLine1,
};
