export default async function main (prisma) {
  console.log('Seeding deflection release reasons...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding deflection release reasons');
  }

  const legacyReason = await prisma.deflectionReleaseReason.findUnique({
    where: { id: 'sobered' },
  });

  if (legacyReason) {
    await prisma.$transaction(async (tx) => {
      const replacementReason = await tx.deflectionReleaseReason.findUnique({
        where: { id: 'can_care_for_themselves' },
      });

      if (replacementReason) {
        await tx.deflection.updateMany({
          where: { releaseReasonId: 'sobered' },
          data: { releaseReasonId: 'can_care_for_themselves' },
        });
        await tx.deflectionUpdate.updateMany({
          where: { releaseReasonId: 'sobered' },
          data: { releaseReasonId: 'can_care_for_themselves' },
        });
        await tx.deflectionReleaseReason.delete({
          where: { id: 'sobered' },
        });
      } else {
        await tx.deflectionReleaseReason.update({
          where: { id: 'sobered' },
          data: {
            id: 'can_care_for_themselves',
            name: 'Can care for themselves',
            updatedById: adminUser.id,
          },
        });
      }
    });
  }

  const deflectionReleaseReasons = [
    {
      id: 'can_care_for_themselves',
      name: 'Can care for themselves',
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
