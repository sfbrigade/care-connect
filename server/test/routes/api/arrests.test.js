import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';

import { build } from '#test/helper.js';

const TEST_API_KEY = 'test-arrests-api-key-do-not-use-in-prod';
const TIMEZONE = 'America/Los_Angeles';
const TARGET_DATE = '2026-04-30';

// Pacific-time anchor points for incidents on the target day vs. surrounding days.
const inDayMorning = DateTime.fromISO(TARGET_DATE, { zone: TIMEZONE }).set({ hour: 10 }).toJSDate();
const inDayEvening = DateTime.fromISO(TARGET_DATE, { zone: TIMEZONE }).set({ hour: 16 }).toJSDate();
const previousDay = DateTime.fromISO(TARGET_DATE, { zone: TIMEZONE }).minus({ days: 1 }).set({ hour: 12 }).toJSDate();
const nextDay = DateTime.fromISO(TARGET_DATE, { zone: TIMEZONE }).plus({ days: 1 }).set({ hour: 12 }).toJSDate();

test('/api/arrests', async (t) => {
  process.env.ARRESTS_API_KEY = TEST_API_KEY;

  const app = await build(t);
  const { prisma } = app;

  let resetFacility;
  let resetBedType;
  let otherFacility; // a non-RESET facility from the shared fixtures
  let user;

  t.beforeEach(async () => {
    user = await prisma.user.findFirst();
    const serviceType = await prisma.serviceType.findFirst();

    resetFacility = await prisma.facility.create({
      data: {
        name: 'RESET',
        type: 'LESC',
        serviceTypeId: serviceType.id,
        createdById: user.id,
        updatedById: user.id,
        bedTypes: {
          create: {
            type: 'CHAIR',
            capacity: 10,
            unavailableUnoccupied: 0,
            unavailableOccupied: 0,
            occupied: 0,
            holds: 0,
            inTransit: 0,
            available: 10,
            createdById: user.id,
            updatedById: user.id,
          },
        },
      },
      include: { bedTypes: true },
    });
    resetBedType = resetFacility.bedTypes[0];

    otherFacility = await prisma.facility.findFirst({ where: { name: 'LESC Facility 1' } });
  });

  // Create an incident + (optionally cancelled) deflection at the given facility.
  // Optional `subject` data and `arrivedAt`/`transferredAt` are persisted on the deflection.
  async function seedArrest ({
    facility,
    bedTypeId,
    arrestedAt,
    addressLine1,
    caseNumber = null,
    cancelled = false,
    subject = null,
    arrivedAt = null,
    transferredAt = null,
    createdByBadgeNumber = null,
  }) {
    const incident = await prisma.incident.create({
      data: {
        facilityId: facility.id,
        addressLine1,
        city: 'San Francisco',
        state: 'CA',
        arrestedAt,
        encounteredVia: 'ON_VIEW',
        caseNumber,
        createdById: user.id,
        createdByBadgeNumber,
        updatedById: user.id,
      },
    });
    const subjectRecord = subject ? await prisma.subject.create({ data: subject }) : null;
    const deflection = await prisma.deflection.create({
      data: {
        incidentId: incident.id,
        facilityId: facility.id,
        bedTypeId,
        createdById: user.id,
        cancelledAt: cancelled ? new Date() : null,
        subjectId: subjectRecord?.id ?? null,
        arrivedAt,
        transferredAt,
      },
    });
    return { incident, deflection, subject: subjectRecord };
  }

  // ── Authentication ──

  await t.test('401 when Authorization header missing', async () => {
    const response = await app.inject().get(`/api/arrests?date=${TARGET_DATE}`);
    assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('401 when Bearer token is wrong', async () => {
    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: 'Bearer not-the-right-token' });
    assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('401 when auth scheme is not Bearer', async () => {
    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Basic ${TEST_API_KEY}` });
    assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  // ── Query validation ──

  await t.test('422 when date param missing', async () => {
    const response = await app.inject()
      .get('/api/arrests')
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
  });

  await t.test('422 when date param is wrong format', async () => {
    const response = await app.inject()
      .get('/api/arrests?date=04/30/2026')
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
  });

  await t.test('422 when date is well-formatted but not a real date', async () => {
    // 2026-13-45 matches the regex but Luxon rejects it as invalid.
    const response = await app.inject()
      .get('/api/arrests?date=2026-13-45')
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
  });

  // ── Response shape and filtering ──

  await t.test('200 with empty array when no arrests on the target day', async () => {
    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    assert.strictEqual(response.statusCode, StatusCodes.OK);
    assert.deepStrictEqual(JSON.parse(response.body), []);
  });

  await t.test('200 returns arrests on the target day, ordered by arrestedAt asc', async () => {
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: inDayEvening, addressLine1: '200 Mission St', caseNumber: 'CS-2026-002' });
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: inDayMorning, addressLine1: '100 Market St', caseNumber: 'CS-2026-001' });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    assert.strictEqual(response.statusCode, StatusCodes.OK);

    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 2);

    // Ordered ascending by arrestedAt
    assert.strictEqual(body[0].address, '100 Market St, San Francisco, CA');
    assert.strictEqual(body[0].caseNumber, 'CS-2026-001');
    assert.strictEqual(body[1].address, '200 Mission St, San Francisco, CA');
    assert.strictEqual(body[1].caseNumber, 'CS-2026-002');
    // Each entry has the full documented field set
    for (const arrest of body) {
      assert.deepStrictEqual(Object.keys(arrest).sort(), [
        'address',
        'arrestedAt',
        'arrestingOfficerBadge',
        'arrestingOfficerName',
        'arrivedAt',
        'caseNumber',
        'dateOfBirth',
        'firstName',
        'lastName',
        'race',
        'sex',
        'transferredAt',
      ]);
      assert.strictEqual(typeof arrest.arrestedAt, 'string');
      assert.match(arrest.arrestedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
  });

  await t.test('caseNumber is null when missing on the underlying incident', async () => {
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: inDayMorning, addressLine1: '100 Market St' });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].caseNumber, null);
  });

  await t.test('excludes arrests at non-RESET facilities', async () => {
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: inDayMorning, addressLine1: '100 Market St' });
    // LESC Facility 1 has its own bedType from the shared fixtures
    const otherBedType = await prisma.bedType.findFirst({ where: { facilityId: otherFacility.id } });
    await seedArrest({ facility: otherFacility, bedTypeId: otherBedType.id, arrestedAt: inDayMorning, addressLine1: '999 Other St' });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    assert.strictEqual(response.statusCode, StatusCodes.OK);

    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].address, '100 Market St, San Francisco, CA');
  });

  await t.test('excludes incidents whose only deflection is cancelled', async () => {
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: inDayMorning, addressLine1: '100 Market St' });
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: inDayEvening, addressLine1: '500 Cancelled Ave', cancelled: true });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].address, '100 Market St, San Francisco, CA');
  });

  await t.test('respects Pacific-time day boundaries (no leakage from neighboring days)', async () => {
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: inDayMorning, addressLine1: '100 Market St' });
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: previousDay, addressLine1: '999 Yesterday Ave' });
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: nextDay, addressLine1: '999 Tomorrow Ave' });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].address, '100 Market St, San Francisco, CA');
  });

  // ── Subject and deflection-timing fields ──

  await t.test('returns subject PII and deflection arrival/transfer timestamps', async () => {
    const arrivedAt = DateTime.fromISO(TARGET_DATE, { zone: TIMEZONE }).set({ hour: 10, minute: 30 }).toJSDate();
    const transferredAt = DateTime.fromISO(TARGET_DATE, { zone: TIMEZONE }).set({ hour: 11 }).toJSDate();
    await seedArrest({
      facility: resetFacility,
      bedTypeId: resetBedType.id,
      arrestedAt: inDayMorning,
      addressLine1: '100 Market St',
      caseNumber: 'CS-2026-001',
      arrivedAt,
      transferredAt,
      subject: {
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-05-15T00:00:00.000Z'),
        sex: 'FEMALE',
        race: 'WHITE',
      },
    });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].firstName, 'Jane');
    assert.strictEqual(body[0].lastName, 'Doe');
    assert.strictEqual(body[0].dateOfBirth, '1990-05-15');
    assert.strictEqual(body[0].sex, 'FEMALE');
    assert.strictEqual(body[0].race, 'WHITE');
    assert.strictEqual(body[0].arrivedAt, arrivedAt.toISOString());
    assert.strictEqual(body[0].transferredAt, transferredAt.toISOString());
  });

  await t.test('returns null PII fields when subject has been anonymized but keeps incident and deflection fields', async () => {
    const arrivedAt = DateTime.fromISO(TARGET_DATE, { zone: TIMEZONE }).set({ hour: 10, minute: 30 }).toJSDate();
    await seedArrest({
      facility: resetFacility,
      bedTypeId: resetBedType.id,
      arrestedAt: inDayMorning,
      addressLine1: '100 Market St',
      caseNumber: 'CS-2026-001',
      arrivedAt,
      subject: {
        firstName: null,
        lastName: null,
        dateOfBirth: null,
        sex: null,
        race: null,
        anonymizedAt: new Date(),
      },
    });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].firstName, null);
    assert.strictEqual(body[0].lastName, null);
    assert.strictEqual(body[0].dateOfBirth, null);
    assert.strictEqual(body[0].sex, null);
    assert.strictEqual(body[0].race, null);
    assert.strictEqual(body[0].caseNumber, 'CS-2026-001');
    assert.strictEqual(body[0].arrivedAt, arrivedAt.toISOString());
    assert.strictEqual(body[0].address, '100 Market St, San Francisco, CA');
  });

  await t.test('returns null subject and timing fields when no subject is attached and deflection has no arrival/transfer', async () => {
    await seedArrest({
      facility: resetFacility,
      bedTypeId: resetBedType.id,
      arrestedAt: inDayMorning,
      addressLine1: '100 Market St',
    });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].firstName, null);
    assert.strictEqual(body[0].lastName, null);
    assert.strictEqual(body[0].dateOfBirth, null);
    assert.strictEqual(body[0].sex, null);
    assert.strictEqual(body[0].race, null);
    assert.strictEqual(body[0].arrivedAt, null);
    assert.strictEqual(body[0].transferredAt, null);
  });

  await t.test('uses the first-created non-cancelled deflection when an incident has multiple', async () => {
    const firstSubject = await prisma.subject.create({
      data: { firstName: 'First', lastName: 'Deflection', sex: 'MALE', race: 'BLACK' },
    });
    const secondSubject = await prisma.subject.create({
      data: { firstName: 'Second', lastName: 'Deflection', sex: 'FEMALE', race: 'WHITE' },
    });
    const incident = await prisma.incident.create({
      data: {
        facilityId: resetFacility.id,
        addressLine1: '100 Market St',
        city: 'San Francisco',
        state: 'CA',
        arrestedAt: inDayMorning,
        encounteredVia: 'ON_VIEW',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    await prisma.deflection.create({
      data: {
        incidentId: incident.id,
        facilityId: resetFacility.id,
        bedTypeId: resetBedType.id,
        createdById: user.id,
        subjectId: firstSubject.id,
        createdAt: new Date('2026-04-30T08:00:00.000Z'),
      },
    });
    await prisma.deflection.create({
      data: {
        incidentId: incident.id,
        facilityId: resetFacility.id,
        bedTypeId: resetBedType.id,
        createdById: user.id,
        subjectId: secondSubject.id,
        createdAt: new Date('2026-04-30T09:00:00.000Z'),
      },
    });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].firstName, 'First');
    assert.strictEqual(body[0].lastName, 'Deflection');
  });

  // ── Arresting officer fields ──

  await t.test('returns arresting officer first-initial-last-name and badge snapshot', async () => {
    await seedArrest({
      facility: resetFacility,
      bedTypeId: resetBedType.id,
      arrestedAt: inDayMorning,
      addressLine1: '100 Market St',
      createdByBadgeNumber: '1234',
    });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    // user.firstName/lastName from prisma.user.findFirst() — first seeded user is the admin (Admin User)
    assert.strictEqual(body[0].arrestingOfficerName, 'A. User');
    assert.strictEqual(body[0].arrestingOfficerBadge, '1234');
  });

  await t.test('arrestingOfficerBadge is null when no badge snapshot was captured on the incident', async () => {
    await seedArrest({
      facility: resetFacility,
      bedTypeId: resetBedType.id,
      arrestedAt: inDayMorning,
      addressLine1: '100 Market St',
    });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].arrestingOfficerBadge, null);
  });

  await t.test('arrestingOfficerBadge does not fall back to the live user badgeNumber', async () => {
    // Find a seeded user that has a badgeNumber set, then create an incident as that user
    // without snapshotting their badge. The response should still return null — no fallback.
    const badgedUser = await prisma.user.findFirst({ where: { badgeNumber: { not: null } } });
    assert.ok(badgedUser, 'expected at least one seeded user with a badgeNumber');

    await prisma.incident.create({
      data: {
        facilityId: resetFacility.id,
        addressLine1: '100 Market St',
        city: 'San Francisco',
        state: 'CA',
        arrestedAt: inDayMorning,
        encounteredVia: 'ON_VIEW',
        createdById: badgedUser.id,
        updatedById: badgedUser.id,
        deflections: {
          create: {
            facilityId: resetFacility.id,
            bedTypeId: resetBedType.id,
            createdById: badgedUser.id,
          },
        },
      },
    });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 1);
    assert.strictEqual(body[0].arrestingOfficerBadge, null, 'should NOT fall back to user.badgeNumber');
  });
});
