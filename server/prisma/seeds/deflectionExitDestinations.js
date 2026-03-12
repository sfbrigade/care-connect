export default async function main (prisma) {
  console.log('Seeding deflection exit destinations...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding deflection exit destinations');
  }

  const deflectionExitDestinations = [
    {
      id: 'jail',
      name: 'Jail',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'hospital',
      name: 'Hospital',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'street',
      name: 'Street',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'home',
      name: 'Home',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'services_non_hospital',
      name: 'Services - non-hospital',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'did_not_share',
      name: 'Did not share',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'other',
      name: 'Other',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  ];

  for (const destination of deflectionExitDestinations) {
    await prisma.deflectionExitDestination.upsert({
      where: { id: destination.id },
      create: destination,
      update: destination,
    });
    console.log(`Created deflection exit destination: ${destination.id} - ${destination.name}`);
  }

  console.log('Done seeding deflection exit destinations!');
}
