export default async function main (prisma) {
  console.log('Seeding service types...');

  const serviceTypes = [
    {
      id: 'lesc',
      name: 'Law Enforcement Sobering Center',
      description: 'Law Enforcement Sobering Center service type',
    }
  ];

  for (const st of serviceTypes) {
    const existing = await prisma.serviceType.findUnique({
      where: { id: st.id },
    });

    if (existing) {
      console.log(`Service type ${st.id} already exists, skipping...`);
    } else {
      const created = await prisma.serviceType.create({
        data: st,
      });
      console.log(`Created service type: ${created.id} - ${created.name}`);
    }
  }

  console.log('Done seeding service types!');
}
