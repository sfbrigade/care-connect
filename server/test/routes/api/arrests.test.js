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
  async function seedArrest ({ facility, bedTypeId, arrestedAt, addressLine1, cancelled = false }) {
    const incident = await prisma.incident.create({
      data: {
        facilityId: facility.id,
        addressLine1,
        city: 'San Francisco',
        state: 'CA',
        arrestedAt,
        encounteredVia: 'ON_VIEW',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    await prisma.deflection.create({
      data: {
        incidentId: incident.id,
        facilityId: facility.id,
        bedTypeId,
        createdById: user.id,
        cancelledAt: cancelled ? new Date() : null,
      },
    });
    return incident;
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
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: inDayEvening, addressLine1: '200 Mission St' });
    await seedArrest({ facility: resetFacility, bedTypeId: resetBedType.id, arrestedAt: inDayMorning, addressLine1: '100 Market St' });

    const response = await app.inject()
      .get(`/api/arrests?date=${TARGET_DATE}`)
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    assert.strictEqual(response.statusCode, StatusCodes.OK);

    const body = JSON.parse(response.body);
    assert.strictEqual(body.length, 2);

    // Ordered ascending by arrestedAt
    assert.strictEqual(body[0].address, '100 Market St, San Francisco, CA');
    assert.strictEqual(body[1].address, '200 Mission St, San Francisco, CA');
    // Each entry has only timestamp + address, no extra fields
    for (const arrest of body) {
      assert.deepStrictEqual(Object.keys(arrest).sort(), ['address', 'timestamp']);
      assert.strictEqual(typeof arrest.timestamp, 'string');
      assert.match(arrest.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
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
});
