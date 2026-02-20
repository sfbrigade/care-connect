const TEST_SUBJECTS = [
  { firstName: 'Jane', lastName: 'Doe', middleInitial: 'M', dateOfBirth: new Date('1990-05-15'), sex: 'FEMALE', race: 'OTHER' },
  { firstName: 'John', lastName: 'Smith', middleInitial: 'R', dateOfBirth: new Date('1985-11-02'), sex: 'MALE', race: 'WHITE' },
  { firstName: 'Maria', lastName: 'Garcia', middleInitial: 'L', dateOfBirth: new Date('1978-03-22'), sex: 'FEMALE', race: 'HISPANIC' },
  { firstName: 'James', lastName: 'Williams', middleInitial: null, dateOfBirth: new Date('1992-08-10'), sex: 'MALE', race: 'BLACK' },
  { firstName: 'Alex', lastName: 'Chen', middleInitial: 'T', dateOfBirth: new Date('2000-01-30'), sex: 'OTHER', race: 'ASIAN' },
  { firstName: 'Pat', lastName: 'Brown', middleInitial: null, dateOfBirth: new Date('1988-12-05'), sex: 'MALE', race: 'WHITE' },
];

const TEST_STATUSES = [
  'AWAITING_INTAKE',
  'AWAITING_INTAKE',
  'READY_FOR_INTAKE',
  'ADMITTED',
  'RELEASED',
  'EXITED',
];

export default async function main (prisma) {
  console.log('Seeding test deflections...');

  const sfpdUser = await prisma.user.findUnique({
    where: { email: 'sfpd@careconnectsf.org' },
  });
  if (!sfpdUser) {
    console.warn('SFPD user not found, skipping test deflection seed.');
    return;
  }

  const sfsoUser = await prisma.user.findUnique({
    where: { email: 'sfso@careconnectsf.org' },
  });
  if (!sfsoUser) {
    console.warn('SFSO user not found, skipping test deflection seed.');
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

  // Check if we already have test deflections
  const existing = await prisma.deflection.findFirst({
    where: {
      facilityId: facility.id,
      status: 'ACTIVE',
      subjectStatus: 'AWAITING_INTAKE',
    },
  });
  if (existing) {
    console.log('Test deflections already exist, skipping...');
    return;
  }

  const detail = await prisma.deflectionDetail.findFirst();

  let holdsPlaced = 0;
  let incident;
  for (let i = 0; i < TEST_SUBJECTS.length; i++) {
    const subjectData = TEST_SUBJECTS[i];
    const subjectStatus = TEST_STATUSES[i];

    const subject = await prisma.subject.create({
      data: subjectData,
    });

    if ((i % 3) === 0) {
      const arrivedAt = new Date(Date.now() - 60 * 60 * 1000);
      const now = new Date();
      incident = await prisma.incident.create({
        data: {
          facilityId: facility.id,
          addressLine1: '850 Bryant St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94103',
          arrestedAt: new Date(),
          cadNumber: `25020${1234 + i}`,
          supervisorBadgeNumber: '1234',
          arrivedAt,
          leftAt: now,
          completedAt: now,
          createdById: sfpdUser.id,
          createdByOrganizationId: sfpdUser.organizationId,
          updatedById: sfpdUser.id,
        },
      });
    }

    const now = new Date();
    const isActive = !['RELEASED', 'EXITED'].includes(subjectStatus);
    const deflection = await prisma.deflection.create({
      data: {
        facilityId: facility.id,
        incidentId: incident.id,
        bedTypeId: bedType.id,
        subjectId: subject.id,
        subjectStatus,
        status: isActive ? 'ACTIVE' : 'COMPLETED',
        createdById: sfpdUser.id,
        narcoticsSubstance: i % 2 === 0,
        narcoticsParaphernalia: false,
        behavior: 'Cooperative',
        property: 'SMALL',
        transferredAt: now,
        transferredById: sfsoUser.id,
        ...(subjectStatus === 'ADMITTED' || subjectStatus === 'RELEASED' || subjectStatus === 'EXITED'
          ? { admittedAt: now, admittedById: sfsoUser.id }
          : {}),
        ...(subjectStatus === 'RELEASED' || subjectStatus === 'EXITED'
          ? { releasedAt: now, releasedById: sfsoUser.id, completedAt: now }
          : {}),
        ...(subjectStatus === 'EXITED'
          ? { exitedAt: now, exitedById: sfsoUser.id }
          : {}),
        ...(detail ? { deflectionDetails: { connect: { id: detail.id } } } : {}),
      },
    });

    if (isActive) {
      holdsPlaced++;
    }

    console.log(`  Created deflection #${deflection.id} (${subjectData.firstName} ${subjectData.lastName}) — ${subjectStatus}`);
  }

  // Update bed type counts for active holds
  if (holdsPlaced > 0) {
    await prisma.bedType.update({
      where: { id: bedType.id },
      data: {
        occupied: bedType.occupied + holdsPlaced,
        available: bedType.available - holdsPlaced,
      },
    });
  }

  console.log(`Done seeding ${TEST_SUBJECTS.length} test deflections!`);
}
