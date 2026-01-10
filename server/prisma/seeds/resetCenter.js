export default async function main (prisma) {
  console.log('Seeding RESET center...');
  const admin = await prisma.user.findUnique({
    where: {
      email: 'admin@careconnectsf.org',
    },
  });
  const data = {
    name: 'RESET',
    type: 'LESC',
    serviceTypeId: 'lesc',
    subdomain: 'reset',
    addressLine1: '444 6th St',
    createdById: admin.id,
    updatedById: admin.id,
  };
  const facility = await prisma.facility.upsert({
    where: {
      subdomain: 'reset',
    },
    create: data,
    update: data,
  });
  const facilityServiceData = {
    facilityId: facility.id,
    serviceTypeId: 'lesc',
    availableBeds: 16,
    reservedBeds: 0,
  };
  await prisma.facilityService.upsert({
    where: {
      facilityId_serviceTypeId: {
        facilityId: facility.id,
        serviceTypeId: 'lesc',
      },
    },
    create: facilityServiceData,
    update: facilityServiceData,
  });

  console.log('Done seeding RESET');
}
