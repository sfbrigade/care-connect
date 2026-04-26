import { test } from 'node:test';
import * as assert from 'node:assert';
import { DateTime } from 'luxon';

import { build, assetExists } from '#test/helper.js';
import s3 from '#lib/s3.js';
import { PII_FIELDS } from '../../models/subject.js';

test('anonymizeSubjects job', async (t) => {
  delete process.env.DISABLE_ANONYMIZE_SUBJECTS;
  t.after(() => { delete process.env.DISABLE_ANONYMIZE_SUBJECTS; });

  const app = await build(t);
  const { prisma } = app;
  const { default: anonymizeSubjects } = await import('../../jobs/anonymizeSubjects.js');

  const facilityId = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
  const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';

  async function createSubjectWithDeflection (overrides = {}) {
    const user = await prisma.user.findFirst();
    const subject = await prisma.subject.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        middleInitial: 'M',
        dateOfBirth: new Date('1990-01-15'),
        sex: 'MALE',
        race: 'WHITE',
        driverLicense: 'D1234567',
        addressLine1: '123 Main St',
        addressLine2: 'Apt 4',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        localId: 'LOCAL123',
      },
    });
    const incident = await prisma.incident.create({
      data: {
        facilityId,
        encounteredVia: 'ON_VIEW',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const deflectionData = {
      incidentId: incident.id,
      facilityId,
      bedTypeId,
      subjectId: subject.id,
      createdById: user.id,
      status: 'ACTIVE',
      subjectStatus: 'EXITED',
      ...overrides,
    };
    const deflection = await prisma.deflection.create({ data: deflectionData });
    return { subject, deflection, incident, user };
  }

  await t.test('anonymizes eligible subject with terminal deflection older than 72 hours', async () => {
    const { subject, deflection } = await createSubjectWithDeflection();

    await prisma.$executeRawUnsafe(
      'UPDATE "Deflection" SET "updatedAt" = $1 WHERE "id" = $2',
      DateTime.now().minus({ hours: 73 }).toJSDate(),
      deflection.id
    );

    await anonymizeSubjects({}, prisma);

    const updated = await prisma.subject.findUnique({ where: { id: subject.id } });
    assert.ok(updated.anonymizedAt, 'anonymizedAt should be set');
    for (const field of PII_FIELDS) {
      assert.strictEqual(updated[field], null, `${field} should be null after anonymization`);
    }
  });

  await t.test('skips subject with an active deflection', async () => {
    const { subject } = await createSubjectWithDeflection({ status: 'ACTIVE', subjectStatus: 'DETAINED' });

    await anonymizeSubjects({}, prisma);

    const updated = await prisma.subject.findUnique({ where: { id: subject.id } });
    assert.strictEqual(updated.anonymizedAt, null);
    assert.strictEqual(updated.firstName, 'John');
  });

  await t.test('anonymizes subject whose deflection is ACTIVE but subject has exited (terminal subjectStatus)', async () => {
    const { subject, deflection } = await createSubjectWithDeflection({
      status: 'ACTIVE',
      subjectStatus: 'EXITED',
    });

    await prisma.$executeRawUnsafe(
      'UPDATE "Deflection" SET "updatedAt" = $1 WHERE "id" = $2',
      DateTime.now().minus({ hours: 73 }).toJSDate(),
      deflection.id
    );

    await anonymizeSubjects({}, prisma);

    const updated = await prisma.subject.findUnique({ where: { id: subject.id } });
    assert.ok(updated.anonymizedAt, 'ACTIVE deflection in terminal subjectStatus should not block anonymization');
    assert.strictEqual(updated.firstName, null);
  });

  await t.test('skips subject within 72-hour window', async () => {
    await createSubjectWithDeflection();

    await anonymizeSubjects({}, prisma);

    const result = await prisma.subject.findFirst({ where: { firstName: 'John' } });
    assert.ok(result, 'subject should still exist with PII');
    assert.strictEqual(result.anonymizedAt, null);
  });

  await t.test('skips already-anonymized subject', async () => {
    const { subject, deflection } = await createSubjectWithDeflection();

    await prisma.$executeRawUnsafe(
      'UPDATE "Deflection" SET "updatedAt" = $1 WHERE "id" = $2',
      DateTime.now().minus({ hours: 73 }).toJSDate(),
      deflection.id
    );
    await prisma.subject.update({
      where: { id: subject.id },
      data: { anonymizedAt: new Date(), firstName: null, lastName: null },
    });

    await anonymizeSubjects({}, prisma);

    const updated = await prisma.subject.findUnique({ where: { id: subject.id } });
    assert.ok(updated.anonymizedAt, 'anonymizedAt should still be set');
  });

  await t.test('uses most recent deflection updatedAt for 72-hour calculation', async () => {
    const user = await prisma.user.findFirst();
    const subject = await prisma.subject.create({
      data: { firstName: 'Jane', lastName: 'Smith' },
    });
    const incident = await prisma.incident.create({
      data: {
        facilityId,
        encounteredVia: 'ON_VIEW',
        createdById: user.id,
        updatedById: user.id,
      },
    });

    const d1 = await prisma.deflection.create({
      data: {
        incidentId: incident.id,
        facilityId,
        bedTypeId,
        subjectId: subject.id,
        createdById: user.id,
        status: 'EXPIRED',
      },
    });
    await prisma.$executeRawUnsafe(
      'UPDATE "Deflection" SET "updatedAt" = $1 WHERE "id" = $2',
      DateTime.now().minus({ hours: 73 }).toJSDate(),
      d1.id
    );

    await prisma.deflection.create({
      data: {
        incidentId: incident.id,
        facilityId,
        bedTypeId,
        subjectId: subject.id,
        createdById: user.id,
        status: 'CANCELLED',
      },
    });

    await anonymizeSubjects({}, prisma);

    const updated = await prisma.subject.findUnique({ where: { id: subject.id } });
    assert.strictEqual(updated.anonymizedAt, null, 'should not anonymize — most recent deflection is within 72 hours');
    assert.strictEqual(updated.firstName, 'Jane');
  });

  await t.test('anonymizes subject with no deflections whose createdAt is past the cutoff', async () => {
    const subject = await prisma.subject.create({
      data: { firstName: 'No', lastName: 'Deflection' },
    });
    await prisma.$executeRawUnsafe(
      'UPDATE "Subject" SET "createdAt" = $1 WHERE "id" = $2::uuid',
      DateTime.now().minus({ hours: 73 }).toJSDate(),
      subject.id
    );

    await anonymizeSubjects({}, prisma);

    const updated = await prisma.subject.findUnique({ where: { id: subject.id } });
    assert.ok(updated.anonymizedAt, 'subject without deflections should be anonymized past cutoff');
    assert.strictEqual(updated.firstName, null);
  });

  await t.test('skips recently-created subject with no deflections', async () => {
    const subject = await prisma.subject.create({
      data: { firstName: 'Fresh', lastName: 'Subject' },
    });

    await anonymizeSubjects({}, prisma);

    const updated = await prisma.subject.findUnique({ where: { id: subject.id } });
    assert.strictEqual(updated.anonymizedAt, null);
    assert.strictEqual(updated.firstName, 'Fresh');
  });

  await t.test('clears file references and deletes S3 objects for anonymized subjects', async () => {
    const { subject, deflection } = await createSubjectWithDeflection();

    await prisma.$executeRawUnsafe(
      'UPDATE "Deflection" SET "updatedAt" = $1 WHERE "id" = $2',
      DateTime.now().minus({ hours: 73 }).toJSDate(),
      deflection.id
    );

    const user = await prisma.user.findFirst();
    const doc = await prisma.deflectionDocument.create({
      data: {
        deflectionId: deflection.id,
        formId: '647f',
        file: 'test.pdf',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const photo = await prisma.propertyPhoto.create({
      data: {
        deflectionId: deflection.id,
        file: 'photo.jpg',
        createdById: user.id,
        updatedById: user.id,
      },
    });

    const docKey = `deflection_documents/${doc.id}/file/test.pdf`;
    const photoKey = `property_photos/${photo.id}/file/photo.jpg`;
    await s3.putObject(docKey, Buffer.from('fake pdf'));
    await s3.putObject(photoKey, Buffer.from('fake photo'));

    assert.ok(await assetExists(docKey), 'document should exist before anonymization');
    assert.ok(await assetExists(photoKey), 'photo should exist before anonymization');

    await anonymizeSubjects({}, prisma);

    assert.ok(!(await assetExists(docKey)), 'document should be deleted from S3 after anonymization');
    assert.ok(!(await assetExists(photoKey)), 'photo should be deleted from S3 after anonymization');

    const remainingDoc = await prisma.deflectionDocument.findUnique({ where: { id: doc.id } });
    const remainingPhoto = await prisma.propertyPhoto.findUnique({ where: { id: photo.id } });
    assert.ok(remainingDoc, 'document DB row should be kept after anonymization');
    assert.ok(remainingPhoto, 'photo DB row should be kept after anonymization');
    assert.strictEqual(remainingDoc.file, null, 'document file reference should be cleared');
    assert.strictEqual(remainingPhoto.file, null, 'photo file reference should be cleared');

    const updated = await prisma.subject.findUnique({ where: { id: subject.id } });
    assert.ok(updated.anonymizedAt, 'subject should be anonymized');
  });
});
