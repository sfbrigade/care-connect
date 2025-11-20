#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import wellknown from 'wellknown';
import { point } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_KEY = process.env.OPENROUTESERVICE_API_KEY;
if (!API_KEY) {
  console.error('Missing OPENROUTESERVICE_API_KEY environment variable.');
  process.exit(1);
}

const BASE_URL = process.env.OPENROUTESERVICE_BASE_URL ?? 'https://api.openrouteservice.org/geocode/search';
const RATE_LIMIT_DELAY_MS = Number.parseInt(process.env.GEOCODE_RATE_LIMIT_MS ?? '1100', 10);
const NEIGHBORHOODS_CSV_PATH = process.env.NEIGHBORHOODS_CSV_PATH ??
  path.resolve(__dirname, '..', 'static-data', 'SF_Find_Neighborhoods_20251111.csv');
const NST_DISTRICTS_GEOJSON_PATH = path.resolve(__dirname, '..', 'static-data', 'street_team_coverage.geojson');

const prisma = new PrismaClient();
const neighborhoodFeatures = loadNeighborhoodFeatures();
const nstDistrictFeatures = loadNSTDistrictFeatures();

async function main () {
  const { force, dryRun, limit } = parseArgs(process.argv.slice(2));

  const where = force
    ? {}
    : {
        OR: [
          { latitude: null },
          { longitude: null },
          { neighborhood: null },
          { nstDistrict: null },
        ],
      };

  const facilities = await prisma.facility.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: limit ?? undefined,
  });

  if (!facilities.length) {
    console.info('No facilities matched the criteria.');
    return;
  }

  console.info(`Geocoding ${facilities.length} facilities${dryRun ? ' (dry run)' : ''}...`);

  let successCount = 0;
  let failureCount = 0;

  for (const facility of facilities) {
    const address = buildAddressString(facility);
    if (!address) {
      console.warn(`Skipping ${facility.name} (id=${facility.id}): no address data`);
      failureCount += 1;
      continue;
    }

    let latitude = facility.latitude != null ? Number(facility.latitude) : null;
    let longitude = facility.longitude != null ? Number(facility.longitude) : null;
    let shouldUpdateCoords = false;

    try {
      if (latitude == null || longitude == null || force) {
        const coordinates = await geocodeAddress(address);
        if (!coordinates) {
          console.warn(`No geocode result for ${facility.name} (${address})`);
          failureCount += 1;
          continue;
        }
        latitude = coordinates.lat;
        longitude = coordinates.lng;
        shouldUpdateCoords = true;
      }

      let neighborhood = facility.neighborhood ?? null;
      const resolvedNeighborhood = resolveNeighborhood(latitude, longitude);
      if (resolvedNeighborhood) {
        neighborhood = resolvedNeighborhood;
      } else if (force) {
        neighborhood = null;
      }

      let nstDistrict = facility.nstDistrict ?? null;
      const resolvedNSTDistrict = resolveNSTDistrict(latitude, longitude);
      if (resolvedNSTDistrict) {
        nstDistrict = resolvedNSTDistrict;
      } else if (force) {
        nstDistrict = null;
      }

      if (dryRun) {
        console.info(`[Dry Run] ${facility.name} @ ${address} -> ${latitude}, ${longitude} (Neighborhood: ${neighborhood ?? 'Unknown'}, NST District: ${nstDistrict ?? 'Unknown'})`);
        successCount += 1;
      } else {
        const updateData = {};
        if (shouldUpdateCoords) {
          updateData.latitude = latitude;
          updateData.longitude = longitude;
        }
        if (neighborhood !== facility.neighborhood) {
          updateData.neighborhood = neighborhood;
        }
        if (nstDistrict !== facility.nstDistrict) {
          updateData.nstDistrict = nstDistrict;
        }

        if (Object.keys(updateData).length) {
          await prisma.facility.update({
            where: { id: facility.id },
            data: updateData,
          });
          console.info(`Updated ${facility.name}: ${latitude}, ${longitude}${neighborhood ? ` (Neighborhood: ${neighborhood})` : ''}${nstDistrict ? ` (NST District: ${nstDistrict})` : ''}`);
        } else {
          console.info(`No changes needed for ${facility.name}.`);
        }
        successCount += 1;
      }
    } catch (error) {
      console.error(`Failed to geocode ${facility.name}:`, error?.message ?? error);
      failureCount += 1;
    }

    if (!dryRun && RATE_LIMIT_DELAY_MS > 0) {
      await delay(RATE_LIMIT_DELAY_MS);
    }
  }

  console.info(`Geocoding complete. Success: ${successCount}, Failures: ${failureCount}`);
}

function parseArgs (args) {
  let force = false;
  let dryRun = false;
  let limit;

  for (const arg of args) {
    if (arg === '--force') {
      force = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      const value = Number.parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(value) && value > 0) {
        limit = value;
      }
    }
  }

  return { force, dryRun, limit };
}

function buildAddressString (facility) {
  const { addressLine1, city, state, postalCode } = facility;
  const parts = [addressLine1, city, state, postalCode].filter(Boolean);
  return parts.join(', ');
}

async function geocodeAddress (query) {
  const url = new URL(BASE_URL);
  url.searchParams.set('text', query);
  url.searchParams.set('size', '1');
  if (BASE_URL.includes('openrouteservice.org')) {
    url.searchParams.set('api_key', API_KEY);
  }

  const headers = {
    Accept: 'application/json',
  };
  if (!BASE_URL.includes('openrouteservice.org')) {
    headers.Authorization = API_KEY;
  }

  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Geocode request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const feature = data?.features?.[0];
  const [lng, lat] = feature?.geometry?.coordinates ?? [];

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return { lat, lng };
}

function resolveNeighborhood (latitude, longitude) {
  if (!neighborhoodFeatures.length) {
    return null;
  }

  const pointFeature = point([longitude, latitude]);
  for (const feature of neighborhoodFeatures) {
    try {
      if (booleanPointInPolygon(pointFeature, feature.geometry)) {
        return feature.name ?? null;
      }
    } catch (error) {
      // Ignore malformed polygon
    }
  }
  return null;
}

function resolveNSTDistrict (latitude, longitude) {
  if (!nstDistrictFeatures.length) {
    return null;
  }

  const pointFeature = point([longitude, latitude]);
  for (const feature of nstDistrictFeatures) {
    try {
      if (booleanPointInPolygon(pointFeature, feature.geometry)) {
        return feature.name ?? null;
      }
    } catch (error) {
      // Ignore malformed polygon
    }
  }
  return null;
}

function loadNSTDistrictFeatures () {
  try {
    if (!fs.existsSync(NST_DISTRICTS_GEOJSON_PATH)) {
      console.warn(`NST districts GeoJSON not found at ${NST_DISTRICTS_GEOJSON_PATH}; NST district assignment will be skipped.`);
      return [];
    }

    const geojsonContents = fs.readFileSync(NST_DISTRICTS_GEOJSON_PATH, 'utf8');
    const geojson = JSON.parse(geojsonContents);

    if (!geojson.features || !Array.isArray(geojson.features)) {
      console.warn('Invalid GeoJSON structure for NST districts');
      return [];
    }

    return geojson.features
      .map((feature) => {
        if (!feature.geometry || !feature.properties) {
          return null;
        }
        const name = feature.properties.streetteam?.trim() || null;
        return { name, geometry: feature.geometry };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Failed to load NST district polygons:', error?.message ?? error);
    return [];
  }
}

function loadNeighborhoodFeatures () {
  try {
    if (!fs.existsSync(NEIGHBORHOODS_CSV_PATH)) {
      console.warn(`Neighborhood CSV not found at ${NEIGHBORHOODS_CSV_PATH}; neighborhood assignment will be skipped.`);
      return [];
    }

    const csvContents = fs.readFileSync(NEIGHBORHOODS_CSV_PATH, 'utf8');
    const records = parse(csvContents, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records
      .map((record) => {
        const wkt = record.the_geom ?? record.geom ?? null;
        if (!wkt) {
          return null;
        }
        const geometry = wellknown(wkt);
        if (!geometry) {
          return null;
        }
        const name = record.name?.trim() || record.link?.trim() || null;
        return { name, geometry };
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Failed to load neighborhood polygons:', error?.message ?? error);
    return [];
  }
}

function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  prisma.$disconnect().finally(() => process.exit(1));
});

main()
  .catch((error) => {
    console.error('Geocode import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
