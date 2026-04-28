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
      name: 'Can care for themselves',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'medical_issue',
      name: 'Medical issue (physical)',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'behavioral_health_evaluation',
      name: 'Behavioral health evaluation',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'other',
      name: 'Other (please specify)',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'death_in_facility',
      name: 'Death in facility',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'death_in_custody',
      name: 'Death in custody',
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
