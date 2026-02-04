import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedUnitsForOrganization (prisma, adminUser, csvPath, organizationId) {
  if (!fs.existsSync(csvPath)) {
    console.warn(`CSV file not found at ${csvPath}, skipping ${organizationId} units seeding.`);
    return 0;
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const unitIds = fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  let unitsSeeded = 0;

  for (const unitName of unitIds) {
    const uniqueId = slugify(unitName);
    await prisma.unit.upsert({
      where: {
        unitId: {
          id: uniqueId,
          organizationId,
        },
      },
      update: {
        name: unitName,
      },
      create: {
        id: uniqueId,
        name: unitName,
        organizationId,
        createdById: adminUser.id,
      },
    });
    unitsSeeded++;
  }

  return unitsSeeded;
}

export default async function main (prisma) {
  console.log('Seeding units...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding units');
  }

  // Seed SFPD units
  const sfpdPath = path.resolve(__dirname, '../../static-data/SFPD_units.csv');
  const sfpdCount = await seedUnitsForOrganization(prisma, adminUser, sfpdPath, 'sfpd');

  // Seed SFSO units
  const sfsoPath = path.resolve(__dirname, '../../static-data/SFSO_units.csv');
  const sfsoCount = await seedUnitsForOrganization(prisma, adminUser, sfsoPath, 'sfso');

  console.log(`Done seeding units! (SFPD: ${sfpdCount}, SFSO: ${sfsoCount})`);
}
function slugify (value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
