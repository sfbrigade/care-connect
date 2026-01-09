const units = [
  {
    id: 'option-1',
    name: 'Option 1',
    organizationId: 'sfpd',
  },
  {
    id: 'option-2',
    name: 'Option 2',
    organizationId: 'sfpd',
  },
  {
    id: 'option-3',
    name: 'Option 3',
    organizationId: 'sfpd',
  },
  {
    id: 'option-4',
    name: 'Option 4',
    organizationId: 'sfpd',
  },
  {
    id: 'option-5',
    name: 'Option 5',
    organizationId: 'sfpd',
  },
  {
    id: 'option-1',
    name: 'Option 1',
    organizationId: 'sfso',
  },
  {
    id: 'option-2',
    name: 'Option 2',
    organizationId: 'sfso',
  },
  {
    id: 'option-3',
    name: 'Option 3',
    organizationId: 'sfso',
  },
  {
    id: 'option-4',
    name: 'Option 4',
    organizationId: 'sfso',
  },
  {
    id: 'option-5',
    name: 'Option 5',
    organizationId: 'sfso',
  },
];

export default async function (prisma) {
  console.log('Seeding units...');
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });
  for (const unit of units) {
    await prisma.unit.upsert({
      where: { unitId: { id: unit.id, organizationId: unit.organizationId } },
      create: {
        ...unit,
        createdById: admin.id,
      },
      update: {
        ...unit,
        createdById: admin.id,
      },
    });
  }
}
