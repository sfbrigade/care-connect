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
  const bedStatusData = {
    facilityId: facility.id,
    type: 'CHAIR',
    capacity: 16,
    available: 16,
    createdById: admin.id,
    updatedById: admin.id,
  };
  let bedStatus = await prisma.bedStatus.findFirst({
    where: {
      facilityId: facility.id,
    },
  });
  if (bedStatus) {
    await prisma.bedStatus.update({
      where: {
        id: bedStatus.id,
      },
      data: bedStatusData,
    });
  } else {
    bedStatus = await prisma.bedStatus.create({
      data: bedStatusData,
    });
  }

  console.log('Done seeding RESET');
}
