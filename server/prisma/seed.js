import '../config.js';
import prisma from './client.js';
import seedFacilities from './seeds/facilities.js';
import seedServiceTypes from './seeds/serviceTypes.js';
import seedUsers from './seeds/users.js';
import seedResetCenter from './seeds/resetCenter.js';

try {
  await seedFacilities(prisma);
  await seedServiceTypes(prisma);
  await seedUsers(prisma);
  await seedResetCenter(prisma);
} catch (error) {
  console.error('Error seeding:', error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
