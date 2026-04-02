export default async function main (prisma) {
  console.log('Seeding bed type unavailable reasons...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding bed type unavailable reasons');
  }

  const reasons = [
    {
      description: 'Lack of SFSD staffing',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      description: 'Lack of contractor staffing',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      description: 'Building issue',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      description: 'Safety lock-down',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      description: 'Other (specify)',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  ];

  for (const reason of reasons) {
    const existing = await prisma.bedTypeUnavailableReason.findFirst({
      where: { description: reason.description },
    });

    if (existing) {
      console.log(`Bed type unavailable reason "${reason.description}" already exists, skipping...`);
    } else {
      const created = await prisma.bedTypeUnavailableReason.create({
        data: reason,
      });
      console.log(`Created bed type unavailable reason: ${created.id} - ${created.description}`);
    }
  }

  console.log('Done seeding bed type unavailable reasons!');
}
