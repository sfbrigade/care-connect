export default async function main (prisma) {
  console.log('Seeding deflection release reasons...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding deflection release reasons');
  }

  const deflectionReleaseReasons = [
    {
      id: 'sobered',
      name: 'Sobered',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'medical_issue',
      name: 'Medical issue',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'other',
      name: 'Other (please specify)',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  ];

  for (const reason of deflectionReleaseReasons) {
    await prisma.deflectionReleaseReason.upsert({
      where: { id: reason.id },
      create: reason,
      update: reason,
    });
    console.log(`Created deflection release reason: ${reason.id} - ${reason.name}`);
  }

  console.log('Done seeding deflection release reasons!');
}
