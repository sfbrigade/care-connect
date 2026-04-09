import { test } from 'node:test';
import * as assert from 'node:assert';
import { DateTime } from 'luxon';

import { build } from '#test/helper.js';
import { PII_FIELDS } from '../../models/subject.js';

test('anonymizeSubjects job', async (t) => {
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
      status: 'EXPIRED',
      ...overrides,
    };
    const deflection = await prisma.deflection.create({ data: deflectionData });
    return { subject, deflection, incident, user };
  }

  await t.test('anonymizes eligible subject with terminal deflection older than 72 hours', async () => {
    const { subject, deflection } = await createSubjectWithDeflection();

    await prisma.$executeRawUnsafe(
      `UPDATE "Deflection" SET "updatedAt" = $1 WHERE "id" = $2`,
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
    const { subject } = await createSubjectWithDeflection({ status: 'ACTIVE' });

    await anonymizeSubjects({}, prisma);

    const updated = await prisma.subject.findUnique({ where: { id: subject.id } });
    assert.strictEqual(updated.anonymizedAt, null);
    assert.strictEqual(updated.firstName, 'John');
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
      `UPDATE "Deflection" SET "updatedAt" = $1 WHERE "id" = $2`,
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
      `UPDATE "Deflection" SET "updatedAt" = $1 WHERE "id" = $2`,
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
});
