import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function main(prisma) {
  console.log('Seeding units...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding units');
  }

  const csvPath = path.resolve(__dirname, '../../static-data/SFPD_units.csv');

  if (!fs.existsSync(csvPath)) {
    console.warn(`CSV file not found at ${csvPath}, skipping units seeding.`);
    return;
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const unitIds = fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  let unitsSeeded = 0;
  const organizationId = 'sfpd';

  for (const unitId of unitIds) {
    await prisma.unit.upsert({
      where: { 
        unitId: {
          id: unitId,
          organizationId,
        },
      },
      update: {
        name: unitId,
      },
      create: {
        id: unitId,
        name: unitId,
        organizationId,
        createdById: adminUser.id,
      },
    });
    unitsSeeded++;
  }

  console.log(`Done seeding units! (${unitsSeeded} units)`);
}