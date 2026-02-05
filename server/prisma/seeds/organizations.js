const organizations = [
  {
    id: 'sfpd',
    name: 'San Francisco Police Department',
    defaultRole: 'FIELD',
  },
  {
    id: 'sfso',
    name: "San Francisco Sheriff's Office",
    defaultRole: 'CUSTODY',
  },
  {
    id: 'connections',
    name: 'Connections',
    defaultRole: 'CARE',
  }
];

export default async function (prisma) {
  console.log('Seeding organizations...');
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });
  for (const organization of organizations) {
    await prisma.organization.upsert({
      where: { id: organization.id },
      create: {
        ...organization,
        createdById: admin.id,
      },
      update: {
        ...organization,
        createdById: admin.id,
      },
    });
  }
}
