import '../config.js';
import prisma from './client.js';
import seedAdminUser from './seeds/adminUser.js';
import seedUsers from './seeds/users.js';
import seedFacilities from './seeds/facilities.js';
import seedServiceTypes from './seeds/serviceTypes.js';
import seedResetCenter from './seeds/resetCenter.js';
import seedOrganizations from './seeds/organizations.js';
import seedTitles from './seeds/titles.js';
import seedUnits from './seeds/units.js';
import seedTestDeflections from './seeds/testDeflections.js';
import seedHistoricalData from './seeds/historicalData.js';
import { createBoss } from '#lib/jobQueue/pgBoss.js';

try {
  // Calling pg-boss start() ensures the pg-boss schema exists in DB
  const boss = createBoss();
  await boss.start();
  await boss.stop();

  await seedAdminUser(prisma);
  await seedOrganizations(prisma);
  await seedUsers(prisma);
  await seedFacilities(prisma);
  await seedServiceTypes(prisma);
  await seedResetCenter(prisma);
  await seedTitles(prisma);
  await seedUnits(prisma);
  await seedTestDeflections(prisma);
  await seedHistoricalData(prisma);
} catch (error) {
  console.error('Error seeding:', error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
