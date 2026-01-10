export default async function main (prisma) {
  console.log('Seeding facility status reasons...');

  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found for seeding facility status reasons');
  }

  const facilityStatusReasons = [
    {
      id: 'building_issue',
      description: 'Building Issue',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'safety_lockdown',
      description: 'Safety Lock-down',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'other',
      description: 'Other',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'sfso_staffing',
      description: 'Lack of SFSO Staffing',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
    {
      id: 'connections_staffing',
      description: 'Lack of Connections Staffing',
      createdById: adminUser.id,
      updatedById: adminUser.id,
    },
  ];

  for (const fsr of facilityStatusReasons) {
    const existing = await prisma.facilityStatusReason.findUnique({
      where: { id: fsr.id },
    });

    if (existing) {
      console.log(`Facility status reason ${fsr.id} already exists, skipping...`);
    } else {
      const created = await prisma.facilityStatusReason.create({
        data: fsr,
      });
      console.log(`Created facility status reason: ${created.id} - ${created.description}`);
    }
  }

  console.log('Done seeding facility status reasons!');
}
