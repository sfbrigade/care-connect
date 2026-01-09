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
  await prisma.facilityService.create({
    data: {
      facilityId: facility.id,
      serviceTypeId: 'lesc',
      availableBeds: 16,
      reservedBeds: 0,
    },
  });

  console.log('Done seeding RESET');
}
