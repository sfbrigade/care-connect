import { GeoPlacesClient, SuggestCommand } from '@aws-sdk/client-geo-places';

// SF bounding box: [west, south, east, north]
const SF_BOUNDING_BOX = [-122.5155, 37.7080, -122.3570, 37.8120];

let client;

function init () {
  if (!client) {
    client = new GeoPlacesClient({
      credentials: {
        accessKeyId: process.env.AWS_LOCATION_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_LOCATION_SECRET_ACCESS_KEY,
      },
      region: process.env.AWS_LOCATION_REGION ?? 'us-west-2',
    });
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

function reset () {
  client = undefined;
}

export function buildAddressLine1 (address) {
  return [address?.AddressNumber, address?.Street].filter(Boolean).join(' ');
}

export default {
  suggest,
  reset,
};
