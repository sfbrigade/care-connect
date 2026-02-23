export default async function main (prisma) {
  console.log('Seeding test deflection...');

  const sfpdUser = await prisma.user.findUnique({
    where: { email: 'sfpd@careconnectsf.org' },
  });
  if (!sfpdUser) {
    console.warn('SFPD user not found, skipping test deflection seed.');
    return;
  }

  const facility = await prisma.facility.findUnique({
    where: { subdomain: 'reset' },
  });
  if (!facility) {
    console.warn('RESET facility not found, skipping test deflection seed.');
    return;
  }

  const bedType = await prisma.bedType.findFirst({
    where: { facilityId: facility.id },
  });
  if (!bedType) {
    console.warn('No bed type found for RESET, skipping test deflection seed.');
    return;
  }

  // Check if we already have an active test deflection
  const existing = await prisma.deflection.findFirst({
    where: {
      facilityId: facility.id,
      status: 'ACTIVE',
      subjectStatus: 'ONSITE_AWAITING_TRANSFER',
    },
  });
  if (existing) {
    console.log('Test deflection already exists, skipping...');
    return;
  }

  // Create a test subject
  const subject = await prisma.subject.create({
    data: {
      firstName: 'Jane',
      lastName: 'Doe',
      middleInitial: 'M',
      dateOfBirth: new Date('1990-05-15'),
      sex: 'FEMALE',
      race: 'OTHER',
    },
  });

  // Create an incident with all required fields populated
  const incident = await prisma.incident.create({
    data: {
      facilityId: facility.id,
      arrivedAt: new Date(),
      addressLine1: '850 Bryant St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      arrestedAt: new Date(),
      cadNumber: '250201234',
      supervisorBadgeNumber: '1234',
      createdById: sfpdUser.id,
      createdByOrganizationId: sfpdUser.organizationId,
      updatedById: sfpdUser.id,
    },
  });

  // Grab a deflection detail to attach
  const detail = await prisma.deflectionDetail.findFirst();

  // Create the deflection with ONSITE_AWAITING_TRANSFER status
  const deflection = await prisma.deflection.create({
    data: {
      facilityId: facility.id,
      incidentId: incident.id,
      bedTypeId: bedType.id,
      subjectId: subject.id,
      subjectStatus: 'ONSITE_AWAITING_TRANSFER',
      createdById: sfpdUser.id,
      narcoticsSubstance: false,
      narcoticsParaphernalia: false,
      behavior: 'Cooperative',
      property: 'SMALL',
      ...(detail ? { deflectionDetails: { connect: { id: detail.id } } } : {}),
    },
  });

  // Update bed type counts: one hold placed
  await prisma.bedType.update({
    where: { id: bedType.id },
    data: {
      holds: bedType.holds + 1,
      available: bedType.available - 1,
    },
  });

  console.log(`Done seeding test deflection! (deflection #${deflection.id}, subject: Jane M Doe)`);
}
