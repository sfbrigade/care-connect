#!/usr/bin/env node

import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

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

const prisma = new PrismaClient();

async function main () {
  const { force, dryRun, limit } = parseArgs(process.argv.slice(2));

  const where = force
    ? {}
    : {
        OR: [
          { latitude: null },
          { longitude: null }
        ]
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

    try {
      const coordinates = await geocodeAddress(address);

      if (!coordinates) {
        console.warn(`No geocode result for ${facility.name} (${address})`);
        failureCount += 1;
      } else if (dryRun) {
        console.info(`[Dry Run] ${facility.name} @ ${address} -> ${coordinates.lat}, ${coordinates.lng}`);
        successCount += 1;
      } else {
        await prisma.facility.update({
          where: { id: facility.id },
          data: {
            latitude: coordinates.lat,
            longitude: coordinates.lng,
          },
        });
        console.info(`Updated ${facility.name}: ${coordinates.lat}, ${coordinates.lng}`);
        successCount += 1;
      }
    } catch (error) {
      console.error(`Failed to geocode ${facility.name}:`, error?.message ?? error);
      failureCount += 1;
    }

    if (RATE_LIMIT_DELAY_MS > 0) {
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
