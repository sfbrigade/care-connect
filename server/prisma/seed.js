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
import seedFacilityStatusReasons from './seeds/facilityStatusReasons.js';
import seedDeflectionCancelReasons from './seeds/deflectionCancelReasons.js';
import seedDeflectionDetails from './seeds/deflectionDetails.js';
import seedTestDeflection from './seeds/testDeflection.js';

try {
  await seedAdminUser(prisma);
  await seedOrganizations(prisma);
  await seedUsers(prisma);
  await seedFacilities(prisma);
  await seedServiceTypes(prisma);
  await seedResetCenter(prisma);
  await seedTitles(prisma);
  await seedUnits(prisma);
  await seedFacilityStatusReasons(prisma);
  await seedDeflectionCancelReasons(prisma);
  await seedDeflectionDetails(prisma);
  await seedTestDeflection(prisma);
} catch (error) {
  console.error('Error seeding:', error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
