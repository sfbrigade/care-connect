export default async function main (prisma) {
  console.log('Seeding facility status reasons...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding facility status reasons');
  }

  const deflectionCancelReasons = [
    {
      id: '5150',
      name: 'Behavioral health evaluation',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
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
      id: 'release_on_scene',
      name: 'Release on Scene',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'no_chairs_available',
      name: 'No chairs available',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'staffing_shortage',
      name: 'Staffing shortage',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  ];

  for (const dcr of deflectionCancelReasons) {
    const existing = await prisma.deflectionCancelReason.findUnique({
      where: { id: dcr.id },
    });

    if (existing && dcr.id === '5150' && existing.name !== dcr.name) {
      const updated = await prisma.deflectionCancelReason.update({
        where: { id: dcr.id },
        data: {
          name: dcr.name,
          updatedById: dcr.updatedById,
        },
      });
      console.log(`Updated deflection cancel reason: ${updated.id} - ${updated.name}`);
    } else if (existing) {
      console.log(`Deflection cancel reason ${dcr.id} already exists, skipping...`);
    } else {
      const created = await prisma.deflectionCancelReason.create({
        data: dcr,
      });
      console.log(`Created deflection cancel reason: ${created.id} - ${created.name}`);
    }
  }

  console.log('Done seeding deflection cancel reasons!');
}
