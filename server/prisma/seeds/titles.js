const titles = [
  {
    id: 'deputy',
    name: 'Deputy',
    organizationId: 'sfso',
  },
  {
    id: 'sergeant',
    name: 'Sergeant',
    organizationId: 'sfso',
  },
  {
    id: 'lieutenant',
    name: 'Lieutenant',
    organizationId: 'sfso',
  },
  {
    id: 'captain',
    name: 'Captain',
    organizationId: 'sfso',
  },
  {
    id: 'chief',
    name: 'Chief',
    organizationId: 'sfso',
  },
  {
    id: 'assistant-sheriff',
    name: 'Assistant Sheriff',
    organizationId: 'sfso',
  },
  {
    id: 'under-sheriff',
    name: 'Under Sheriff',
    organizationId: 'sfso',
  },
  {
    id: 'sheriff',
    name: 'Sheriff',
    organizationId: 'sfso',
  },
];

export default async function (prisma) {
  console.log('Seeding titles...');
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@careconnectsf.org' },
  });
  for (const title of titles) {
    await prisma.title.upsert({
      where: { titleId: { id: title.id, organizationId: title.organizationId } },
      create: {
        ...title,
        createdById: admin.id,
      },
      update: {
        ...title,
        createdById: admin.id,
      },
    });
  }
}
