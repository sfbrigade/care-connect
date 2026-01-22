import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { parse } from 'csv-parse/sync';
import { FacilityUpdateMethodEnum, FacilityEligibilityTypeEnum } from '@prisma/client';
import { point } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NST_DISTRICTS_GEOJSON_PATH = path.resolve(__dirname, '../..', 'static-data', 'street_team_coverage.geojson');

const nstDistrictFeatures = loadNSTDistrictFeatures();

export default async function main (prisma) {
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
    await prisma.bedTypeUpdate.deleteMany({});
  }

  const admin = await prisma.user.findUnique({
    where: {
      email: 'admin@careconnectsf.org',
    },
  });

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

    // Resolve NST district if coordinates are available
    if (facility?.latitude != null && facility?.longitude != null) {
      const latitude = Number(facility.latitude);
      const longitude = Number(facility.longitude);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        const resolvedDistrict = resolveNSTDistrict(latitude, longitude);
        if (resolvedDistrict) {
          facilityData.nstDistrict = resolvedDistrict;
        }
      }
    }

    const serviceTypeName = record['Service Category'] || 'General';
    const serviceType = await getOrCreateServiceType(prisma, serviceTypeName, serviceTypesCache, dryRun);

    if (dryRun) {
      facility = facility ?? { id: '<dry-run-id>' };
    } else if (facility) {
      facility = await prisma.facility.update({
        where: { id: facility.id },
        data: {
          ...facilityData,
          updatedById: admin.id,
        },
      });
      updatedFacilities += 1;
    } else {
      facility = await prisma.facility.create({
        data: {
          ...facilityData,
          name: facilityName,
          serviceTypeId: serviceType.id,
          createdById: admin.id,
          updatedById: admin.id,
        },
      });
      createdFacilities += 1;
    }

    const { availableBeds, totalBeds, reservedBeds } = buildCapacityData(record);
    if (!dryRun) {
      let bedType = await prisma.bedType.findFirst({
        where: {
          facilityId: facility.id,
        },
      });
      if (bedType) {
        await prisma.bedType.update({
          where: {
            id: bedType.id,
          },
          data: {
            capacity: totalBeds ?? availableBeds ?? 0,
            available: availableBeds ?? 0,
            unavailableUnoccupied: reservedBeds ?? 0,
            updatedById: admin.id,
          },
        });
      } else {
        bedType = await prisma.bedType.create({
          data: {
            facilityId: facility.id,
            capacity: totalBeds ?? availableBeds ?? 0,
            available: availableBeds ?? 0,
            unavailableUnoccupied: reservedBeds ?? 0,
            createdById: admin.id,
            updatedById: admin.id,
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
    filePath: filePath ?? path.resolve(__dirname, '../..', 'static-data', 'treatment_centers.csv'),
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
  const { nstDistrict, latitude, longitude } = record;

  return {
    description: record['CareConnect MVP'] || record['Capacity Constraints'] || null,
    phone: normalizePhone(record['Contact phone number (or how to reach operator)']),
    email: null,
    addressLine1: address || null,
    city,
    state,
    postalCode,
    neighborhood,
    nstDistrict,
    latitude,
    longitude,
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
  if (normalized.includes('age')) return FacilityEligibilityTypeEnum.AGE;
  if (normalized.includes('gender') || normalized.includes('women') || normalized.includes('men')) {
    return FacilityEligibilityTypeEnum.GENDER;
  }
  if (normalized.includes('ambulatory')) return FacilityEligibilityTypeEnum.AMBULATORY;
  if (normalized.includes('adl')) return FacilityEligibilityTypeEnum.ADL_INDEPENDENT;
  if (normalized.includes('device')) return FacilityEligibilityTypeEnum.MOBILITY_DEVICES;
  if (normalized.includes('neighborhood') || normalized.includes('district')) return FacilityEligibilityTypeEnum.NEIGHBORHOOD;
  if (normalized.includes('language')) return FacilityEligibilityTypeEnum.LANGUAGE;
  if (normalized.includes('pet')) return FacilityEligibilityTypeEnum.PETS;
  if (normalized.includes('housing')) return FacilityEligibilityTypeEnum.HOUSING_STATUS;
  if (normalized.includes('sexual')) return FacilityEligibilityTypeEnum.SEXUAL_ORIENTATION;
  if (normalized.includes('race')) return FacilityEligibilityTypeEnum.RACE;
  return FacilityEligibilityTypeEnum.OTHER;
}

async function getOrCreateServiceType (prisma, name, cache, dryRun) {
  const id = slugify(name || 'General');
  if (cache.has(id)) {
    return cache.get(id);
  }

  if (dryRun) {
    const placeholder = { id, name };
    cache.set(id, placeholder);
    return placeholder;
  }

  const serviceType = await prisma.serviceType.upsert({
    where: { id },
    update: { name },
    create: { id, name },
  });

  cache.set(id, serviceType);
  return serviceType;
}

function mapUpdateMethod (value) {
  if (!value) {
    return FacilityUpdateMethodEnum.MANUAL;
  }
  const normalized = value.toLowerCase();
  if (normalized.includes('api')) return FacilityUpdateMethodEnum.API;
  if (normalized.includes('text')) return FacilityUpdateMethodEnum.AUTOMATED_TEXT;
  if (normalized.includes('call')) return FacilityUpdateMethodEnum.AUTOMATED_CALL;
  if (normalized.includes('integration')) return FacilityUpdateMethodEnum.INTEGRATION;
  if (normalized.includes('whiteboard')) return FacilityUpdateMethodEnum.WHITEBOARD;
  return FacilityUpdateMethodEnum.MANUAL;
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
  return (value || 'general')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'general';
}

function isOutOfCounty (record) {
  const markers = ['out of county', 'out-of-county', 'out_of_county'];
  const address = (record['DPH Address'] || record['DRAFT Site address'] || '').toLowerCase();
  return markers.some(marker => address.includes(marker));
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
