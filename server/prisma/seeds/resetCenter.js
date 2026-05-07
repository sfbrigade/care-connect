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
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94103',
    phone: '(415) 684-1902',
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
  const bedTypeData = {
    facilityId: facility.id,
    type: 'CHAIR',
    capacity: 25,
    available: 25,
    createdById: admin.id,
    updatedById: admin.id,
  };
  let bedType = await prisma.bedType.findFirst({
    where: {
      facilityId: facility.id,
    },
  });
  if (bedType) {
    await prisma.bedType.update({
      where: {
        id: bedType.id,
      },
      data: bedTypeData,
    });
  } else {
    bedType = await prisma.bedType.create({
      data: bedTypeData,
    });
  }

  console.log('Done seeding RESET');
}
