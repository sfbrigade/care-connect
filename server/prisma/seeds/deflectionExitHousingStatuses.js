export default async function main (prisma) {
  console.log('Seeding deflection exit housing statuses...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding deflection exit housing statuses');
  }

  const deflectionExitHousingStatuses = [
    {
      id: 'permanent',
      name: 'Permanent',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'sheltered',
      name: 'Sheltered',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'temporary',
      name: 'Temporary',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'unknown',
      name: 'Unknown',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'declined_consent',
      name: 'Did not share',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  ];

  for (const status of deflectionExitHousingStatuses) {
    await prisma.deflectionExitHousingStatus.upsert({
      where: { id: status.id },
      create: status,
      update: status,
    });
    console.log(`Created deflection exit housing status: ${status.id} - ${status.name}`);
  }

  console.log('Done seeding deflection exit housing statuses!');
}
