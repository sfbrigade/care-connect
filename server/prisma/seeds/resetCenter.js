export default async function main (prisma) {
  console.log('Seeding RESET center...');

  const facility = await prisma.facility.create({
    data: {
      name: 'RESET',
      type: 'LESC',
      subdomain: 'reset',
      addressLine1: '444 6th St',
    },
  });
  const serviceType = await prisma.serviceType.findUnique({
    where: { code: 'LESC' },
  });
  await prisma.facilityService.create({
    data: {
      facilityId: facility.id,
      serviceTypeId: serviceType.id,
      availableBeds: 16,
      reservedBeds: 0,
    },
  });

  console.log('Done seeding RESET');
}
