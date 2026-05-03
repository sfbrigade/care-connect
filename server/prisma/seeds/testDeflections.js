import s3 from '#lib/s3.js';

// Compressed backpack photo (200x200 JPEG)
const PROPERTY_PHOTO = Buffer.from(
  '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',
  'base64'
);

// Minimal valid PDF
const TINY_PDF = Buffer.from('%PDF-1.0\n1 0 obj<</Pages 2 0 R>>endobj 2 0 obj<</Kids[3 0 R]/Count 1>>endobj 3 0 obj<</MediaBox[0 0 3 3]>>endobj\n%%EOF');

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

  // Clean up S3 assets from previous seeds
  await s3.deleteObjects('deflection_documents/');
  await s3.deleteObjects('property_photos/');

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
    const deflection = await prisma.deflection.create({
      data: {
        facilityId: facility.id,
        incidentId: incident.id,
        bedTypeId: bedType.id,
        subjectId: subject.id,
        subjectStatus,
        status: 'ACTIVE',
        createdById: sfpdUser.id,
        narcoticsSubstance: i % 2 === 0,
        narcoticsParaphernalia: false,
        chargeType: 'RWS_647F',
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

    // Seed a document and property photo with files in MinIO
    const doc = await prisma.deflectionDocument.create({
      data: {
        deflectionId: deflection.id,
        formId: '647f',
        file: `647f-${deflection.id}.pdf`,
        createdById: sfpdUser.id,
        updatedById: sfpdUser.id,
      },
    });
    await s3.putObject(`deflection_documents/${doc.id}/file/647f-${deflection.id}.pdf`, TINY_PDF);

    const photo = await prisma.propertyPhoto.create({
      data: {
        deflectionId: deflection.id,
        file: `property-${deflection.id}.png`,
        createdById: sfpdUser.id,
        updatedById: sfpdUser.id,
      },
    });
    await s3.putObject(`property_photos/${photo.id}/file/property-${deflection.id}.png`, PROPERTY_PHOTO);

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
      certifiedAt: pdfTestNow,
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
