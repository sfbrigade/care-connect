export default async function main (prisma) {
  console.log('Seeding deflection refusal reasons...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding deflection refusal reasons');
  }

  const deflectionRefusalReasons = [
    {
      id: 'aggressive_behavior',
      name: 'Aggressive behavior',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'medical_issue',
      name: 'Medical issue',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  ];

  for (const reason of deflectionRefusalReasons) {
    await prisma.deflectionRefusalReason.upsert({
      where: { id: reason.id },
      create: reason,
      update: reason,
    });
    console.log(`Created deflection refusal reason: ${reason.id} - ${reason.name}`);
  }

  console.log('Done seeding deflection refusal reasons!');
}
