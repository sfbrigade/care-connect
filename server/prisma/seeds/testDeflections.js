const TEST_SUBJECTS = [
  { firstName: 'Jane', lastName: 'Doe', middleInitial: 'M', dateOfBirth: new Date('1990-05-15'), sex: 'FEMALE', race: 'OTHER' },
  { firstName: 'John', lastName: 'Smith', middleInitial: 'R', dateOfBirth: new Date('1985-11-02'), sex: 'MALE', race: 'WHITE' },
  { firstName: 'Maria', lastName: 'Garcia', middleInitial: 'L', dateOfBirth: new Date('1978-03-22'), sex: 'FEMALE', race: 'HISPANIC' },
  { firstName: 'James', lastName: 'Williams', middleInitial: null, dateOfBirth: new Date('1992-08-10'), sex: 'MALE', race: 'BLACK' },
  { firstName: 'Alex', lastName: 'Chen', middleInitial: 'T', dateOfBirth: new Date('2000-01-30'), sex: 'OTHER', race: 'ASIAN' },
  { firstName: 'Pat', lastName: 'Brown', middleInitial: null, dateOfBirth: new Date('1988-12-05'), sex: 'MALE', race: 'WHITE' },
];

// Holds = chair reserved, person not yet formally in a chair (DETAINED through ADMITTED)
// Occupied = person formally in a chair (IN_CHAIR, RELEASED)
// The hold → occupied transition happens at intake-complete (ADMITTED → IN_CHAIR)
const HOLD_STATUSES = ['DETAINED', 'ONSITE_AWAITING_TRANSFER', 'AWAITING_INTAKE', 'READY_FOR_INTAKE', 'ADMITTED', 'FAILED_INTAKE'];
const OCCUPIED_STATUSES = ['IN_CHAIR'];

const TEST_STATUSES = [
  'AWAITING_INTAKE',
  'READY_FOR_INTAKE',
  'ADMITTED',
  'IN_CHAIR',
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

  let holdsCount = 0;
  let occupiedCount = 0;
  let incident;
  for (let i = 0; i < TEST_SUBJECTS.length; i++) {
    const subjectData = TEST_SUBJECTS[i];
    const subjectStatus = TEST_STATUSES[i];

    const subject = await prisma.subject.create({
      data: subjectData,
    });

    if ((i % 3) === 0) {
      incident = await prisma.incident.create({
        data: {
          facilityId: facility.id,
          addressLine1: '850 Bryant St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94103',
          arrestedAt: new Date(),
          encounteredVia: 'DISPATCHED',
          cadNumber: `25020${1234 + i}`,
          supervisorBadgeNumber: '1234',
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
        ...(['ADMITTED', 'IN_CHAIR', 'RELEASED', 'EXITED'].includes(subjectStatus)
          ? { admittedAt: now, admittedById: sfsoUser.id }
          : {}),
        ...(subjectStatus === 'RELEASED' || subjectStatus === 'EXITED'
          ? { releasedAt: now, releasedById: sfsoUser.id, completedAt: now }
          : {}),
        ...(subjectStatus === 'EXITED'
          ? { exitedAt: now, exitedById: sfsoUser.id }
          : {}),
      },
    });

    if (HOLD_STATUSES.includes(subjectStatus)) {
      holdsCount++;
    } else if (OCCUPIED_STATUSES.includes(subjectStatus)) {
      occupiedCount++;
    }

    console.log(`  Created deflection #${deflection.id} (${subjectData.firstName} ${subjectData.lastName}) — ${subjectStatus}`);
  }

  // Create a rich deflection for PDF field verification tests (849b, cert)
  const pdfTestSubject = await prisma.subject.create({
    data: {
      firstName: 'Swilly',
      lastName: 'Willy',
      middleInitial: 'Q',
      dateOfBirth: new Date('2001-10-01'),
      sex: 'MALE',
      race: 'WHITE',
      addressLine1: '123 Test St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      driverLicense: 'D1234567',
    },
  });

  const pdfTestIncident = await prisma.incident.create({
    data: {
      facilityId: facility.id,
      addressLine1: '100 Market St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      arrestedAt: new Date(),
      encounteredVia: 'ON_VIEW',
      cadNumber: 'CAD849B',
      caseNumber: 'CS849B',
      supervisorBadgeNumber: '9999',
      createdById: sfpdUser.id,
      createdByOrganizationId: sfpdUser.organizationId,
      createdByBadgeNumber: sfpdUser.badgeNumber,
      updatedById: sfpdUser.id,
    },
  });

  const releaseReason = await prisma.deflectionReleaseReason.findFirst({
    where: { id: 'sobered' },
  });

  const pdfTestNow = new Date();
  const pdfTestDeflection = await prisma.deflection.create({
    data: {
      facilityId: facility.id,
      incidentId: pdfTestIncident.id,
      bedTypeId: bedType.id,
      subjectId: pdfTestSubject.id,
      subjectStatus: 'RELEASED',
      status: 'COMPLETED',
      createdById: sfpdUser.id,
      currentOfficerId: sfpdUser.id,
      narcoticsSubstance: true,
      narcoticsParaphernalia: true,
      drugType: 'FENTANYL',
      behavior: 'Officer encountered this individual at 100 Market St, San Francisco, CA. Officer observed the following behaviors: Disoriented to person/place/time. Officer observed that drugs were recently used: Fentanyl.',
      releaseNarrative: 'Incident number: CS849B\nCad number: CAD849B\nSubject was brought to RESET because they were found to be under the influence of a controlled substance or alcohol in a public location. Upon being able to care for themselves, they were released from their detention.',
      property: 'SMALL',
      arrivedAt: new Date(Date.now() - 60 * 60 * 1000),
      transferredAt: pdfTestNow,
      transferredById: sfsoUser.id,
      admittedAt: pdfTestNow,
      admittedById: sfsoUser.id,
      releasedAt: pdfTestNow,
      releasedById: sfsoUser.id,
      releaseReasonId: releaseReason?.id || 'sobered',
      completedAt: pdfTestNow,
    },
  });

  console.log(`  Created PDF test deflection #${pdfTestDeflection.id} (Swilly Willy) — RELEASED (rich data for 849b/cert tests)`);

  // Update bed type counts to reflect seeded deflections
  if (holdsCount > 0 || occupiedCount > 0) {
    await prisma.bedType.update({
      where: { id: bedType.id },
      data: {
        holds: holdsCount,
        occupied: occupiedCount,
        available: bedType.available - holdsCount - occupiedCount,
      },
    });
  }

  console.log(`Done seeding ${TEST_SUBJECTS.length} test deflections!`);
}
