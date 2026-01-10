import '../config.js';
import prisma from './client.js';
import seedUsers from './seeds/users.js';
import seedFacilities from './seeds/facilities.js';
import seedServiceTypes from './seeds/serviceTypes.js';
import seedResetCenter from './seeds/resetCenter.js';
import seedOrganizations from './seeds/organizations.js';
import seedTitles from './seeds/titles.js';
import seedUnits from './seeds/units.js';

try {
  await seedUsers(prisma);
  await seedFacilities(prisma);
  await seedServiceTypes(prisma);
  await seedResetCenter(prisma);
  await seedOrganizations(prisma);
  await seedTitles(prisma);
  await seedUnits(prisma);
} catch (error) {
  console.error('Error seeding:', error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
