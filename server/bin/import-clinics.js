#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import { PrismaClient, FacilityUpdateMethod, FacilityEligibilityType } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main () {
  const { filePath, dryRun, truncateSnapshots } = parseArgs(process.argv.slice(2));
  const absolutePath = resolveFilePath(filePath);
  const fileContents = fs.readFileSync(absolutePath, 'utf8');
  const records = parse(fileContents, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (!records.length) {
    console.warn(`No records found in ${absolutePath}`);
    return;
  }

  console.info(`Importing ${records.length} clinic records from ${absolutePath}${dryRun ? ' (dry run)' : ''}`);

  if (truncateSnapshots && !dryRun) {
    await prisma.facilityCapacitySnapshot.deleteMany({});
  }

  let createdFacilities = 0;
  let updatedFacilities = 0;
  const serviceTypesCache = new Map();

  for (const record of records) {
    const facilityName = record['DPH Name'] || record['DRAFT Name'] || record['DRAFT Site Nickname'];
    if (!facilityName) {
      continue;
    }
    if (isOutOfCounty(record)) {
      console.info(`Skipping ${facilityName}: address marked as out of county`);
      continue;
    }
    const facilityData = buildFacilityData(record);
    let facility = await prisma.facility.findFirst({
      where: { name: facilityName },
    });

    if (dryRun) {
      facility = facility ?? { id: '<dry-run-id>' };
    } else if (facility) {
      facility = await prisma.facility.update({
        where: { id: facility.id },
        data: facilityData,
      });
      updatedFacilities += 1;
    } else {
      facility = await prisma.facility.create({
        data: {
          name: facilityName,
          ...facilityData,
        },
      });
      createdFacilities += 1;
    }

    const serviceTypeName = record['Service Category'] || 'General';
    const serviceType = await getOrCreateServiceType(serviceTypeName, serviceTypesCache, dryRun);

    const { availableBeds, totalBeds, reservedBeds, description } = buildCapacityData(record);
    if (!dryRun) {
      await prisma.facilityService.upsert({
        where: {
          facilityId_serviceTypeId: {
            facilityId: facility.id,
            serviceTypeId: serviceType.id,
          },
        },
        update: {
          availableBeds,
          reservedBeds,
          description,
        },
        create: {
          facilityId: facility.id,
          serviceTypeId: serviceType.id,
          availableBeds,
          reservedBeds,
          description,
        },
      });

      if (totalBeds !== null || availableBeds !== null || reservedBeds !== null) {
        await prisma.facilityCapacitySnapshot.create({
          data: {
            facilityId: facility.id,
            totalBeds,
            availableBeds,
            reservedBeds,
            lastSyncSource: record['Avail management'] || 'clinics.csv',
          },
        });
      }

      const contactData = buildContactData(record);
      if (contactData) {
        const existingContact = await prisma.facilityContact.findFirst({
          where: {
            facilityId: facility.id,
            AND: [
              { name: contactData.name },
              { phone: contactData.phone },
            ],
          },
        });
        if (existingContact) {
          await prisma.facilityContact.update({
            where: { id: existingContact.id },
            data: contactData,
          });
        } else {
          await prisma.facilityContact.create({
            data: {
              facilityId: facility.id,
              ...contactData,
            },
          });
        }
      }

      const eligibilityData = buildEligibilityData(record);
      if (eligibilityData.length) {
        await prisma.facilityEligibility.deleteMany({ where: { facilityId: facility.id } });
        await prisma.facilityEligibility.createMany({
          data: eligibilityData.map((payload) => ({
            facilityId: facility.id,
            ...payload,
          })),
        });
      }
    }
  }

  console.info(`Facilities created: ${createdFacilities}`);
  console.info(`Facilities updated: ${updatedFacilities}`);
}

function parseArgs (args) {
  let filePath;
  let dryRun = false;
  let truncateSnapshots = false;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--truncate-snapshots') {
      truncateSnapshots = true;
    } else if (arg.startsWith('--file=')) {
      filePath = arg.split('=')[1];
    } else if (!filePath) {
      filePath = arg;
    }
  }

  return {
    filePath: filePath ?? path.resolve(__dirname, '..', '..', 'clinics.csv'),
    dryRun,
    truncateSnapshots,
  };
}

function resolveFilePath (filePath) {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(process.cwd(), filePath);
}

function buildFacilityData (record) {
  const address = record['DPH Address'] || record['DRAFT Site address'];
  const { city, state, postalCode } = parseAddress(address);
  const neighborhood = (record.Neighborhood || '').trim() || null;

  return {
    description: record['CareConnect MVP'] || record['Capacity Constraints'] || null,
    phone: normalizePhone(record['Contact phone number (or how to reach operator)']),
    email: null,
    addressLine1: address || null,
    city,
    state,
    postalCode,
    neighborhood,
    isActive: (record['CareConnect MVP'] || '').toUpperCase().includes('X'),
    updateMethod: mapUpdateMethod(record['Avail management']),
    updateNotes: buildUpdateNotes(record),
  };
}

function buildCapacityData (record) {
  const totalBeds = parseInteger(record['DPH # beds']);
  const availableBeds = parseInteger(record['Point in Time Capacity']);
  let reservedBeds = parseInteger(record['Reserved beds']);

  if (reservedBeds === null && totalBeds !== null && availableBeds !== null) {
    reservedBeds = Math.max(totalBeds - availableBeds, 0);
  }

  return {
    totalBeds,
    availableBeds: availableBeds ?? 0,
    reservedBeds: reservedBeds ?? 0,
    description: record['Capacity Constraints'] || null,
  };
}

function buildContactData (record) {
  const name = record['Site operator/Agency'] || record['Contact phone number (or how to reach operator)'];
  const phone = normalizePhone(record['Contact phone number (or how to reach operator)']);
  const notes = record['Key Access Notes'] || record['Intake Process Summary'] || null;

  if (!name && !phone && !notes) {
    return null;
  }

  return {
    name: name || 'Primary Contact',
    phone,
    role: record['Staffing'] || null,
    notes,
    isPrimary: true,
  };
}

function buildEligibilityData (record) {
  const rawEligibility = record['Eligibility Requirements'];
  if (!rawEligibility) {
    return [];
  }

  return rawEligibility
    .split(/[,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => ({
      type: inferEligibilityType(value),
      value,
    }));
}

function inferEligibilityType (value) {
  const normalized = value.toLowerCase();
  if (normalized.includes('age')) return FacilityEligibilityType.AGE;
  if (normalized.includes('gender') || normalized.includes('women') || normalized.includes('men')) {
    return FacilityEligibilityType.GENDER;
  }
  if (normalized.includes('ambulatory')) return FacilityEligibilityType.AMBULATORY;
  if (normalized.includes('adl')) return FacilityEligibilityType.ADL_INDEPENDENT;
  if (normalized.includes('device')) return FacilityEligibilityType.MOBILITY_DEVICES;
  if (normalized.includes('neighborhood') || normalized.includes('district')) return FacilityEligibilityType.NEIGHBORHOOD;
  if (normalized.includes('language')) return FacilityEligibilityType.LANGUAGE;
  if (normalized.includes('pet')) return FacilityEligibilityType.PETS;
  if (normalized.includes('housing')) return FacilityEligibilityType.HOUSING_STATUS;
  if (normalized.includes('sexual')) return FacilityEligibilityType.SEXUAL_ORIENTATION;
  if (normalized.includes('race')) return FacilityEligibilityType.RACE;
  return FacilityEligibilityType.OTHER;
}

async function getOrCreateServiceType (name, cache, dryRun) {
  const code = slugify(name || 'General');
  if (cache.has(code)) {
    return cache.get(code);
  }

  if (dryRun) {
    const placeholder = { id: `<dry-run-service-${code}>`, code, name };
    cache.set(code, placeholder);
    return placeholder;
  }

  const serviceType = await prisma.serviceType.upsert({
    where: { code },
    update: { name },
    create: { code, name },
  });

  cache.set(code, serviceType);
  return serviceType;
}

function mapUpdateMethod (value) {
  if (!value) {
    return FacilityUpdateMethod.MANUAL;
  }
  const normalized = value.toLowerCase();
  if (normalized.includes('api')) return FacilityUpdateMethod.API;
  if (normalized.includes('text')) return FacilityUpdateMethod.AUTOMATED_TEXT;
  if (normalized.includes('call')) return FacilityUpdateMethod.AUTOMATED_CALL;
  if (normalized.includes('integration')) return FacilityUpdateMethod.INTEGRATION;
  if (normalized.includes('whiteboard')) return FacilityUpdateMethod.WHITEBOARD;
  return FacilityUpdateMethod.MANUAL;
}

function buildUpdateNotes (record) {
  const notes = [];
  if (record['Hours of operation']) {
    notes.push(`Hours: ${record['Hours of operation']}`);
  }
  if (record['Hours of intake']) {
    notes.push(`Intake Hours: ${record['Hours of intake']}`);
  }
  if (record['Transport in']) {
    notes.push(`Transport In: ${record['Transport in']}`);
  }
  if (record['Transport out']) {
    notes.push(`Transport Out: ${record['Transport out']}`);
  }
  if (record['Intake Process Summary']) {
    notes.push(`Intake: ${record['Intake Process Summary']}`);
  }
  if (record['Key Access Notes']) {
    notes.push(`Access Notes: ${record['Key Access Notes']}`);
  }
  if (record['Data Integration Level']) {
    notes.push(`Integration: ${record['Data Integration Level']}`);
  }
  return notes.join(' | ') || null;
}

function parseInteger (value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number.parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizePhone (value) {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value.trim();
}

function parseAddress (raw) {
  if (!raw) {
    return { city: null, state: null, postalCode: null };
  }
  const matches = raw.match(/,?\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?$/);
  if (!matches) {
    return { city: null, state: null, postalCode: null };
  }
  return {
    city: matches[1] || null,
    state: matches[2] || null,
    postalCode: matches[3] || null,
  };
}

function slugify (value) {
  return (value || 'GENERAL')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'GENERAL';
}

function isOutOfCounty (record) {
  const markers = ['out of county', 'out-of-county', 'out_of_county'];
  const address = (record['DPH Address'] || record['DRAFT Site address'] || '').toLowerCase();
  return markers.some(marker => address.includes(marker));
}

process.on('unhandledRejection', (error) => {
  console.error(error);
  prisma.$disconnect().finally(() => process.exit(1));
});

process.on('SIGINT', () => {
  prisma.$disconnect().finally(() => process.exit());
});

main()
  .catch((error) => {
    console.error('Import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
