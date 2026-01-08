export default async function main (prisma) {
  console.log('Seeding service types...');

  const serviceTypes = [
    {
      code: 'LESC',
      name: 'Law Enforcement Sobering Center',
      description: 'Law Enforcement Sobering Center service type',
    }
  ];

  for (const st of serviceTypes) {
    const existing = await prisma.serviceType.findUnique({
      where: { code: st.code },
    });

    if (existing) {
      console.log(`Service type ${st.code} already exists, skipping...`);
    } else {
      const created = await prisma.serviceType.create({
        data: st,
      });
      console.log(`Created service type: ${created.code} - ${created.name}`);
    }
  }

  console.log('Done seeding service types!');
}
