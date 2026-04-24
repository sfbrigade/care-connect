import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

// lescFacility1 hosts user2's active pre-transfer holds (deflections 4 and 5 are DETAINED;
// deflection 6 is READY_FOR_INTAKE and deflection 7 is RELEASED, both post-transfer).
const FACILITY_ID = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
const OTHER_FACILITY_ID = 'fab67d53-a1c7-4eb5-b151-33727270ad20';
const USER2_ID = 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5';

test('POST /api/facilities/:facilityId/arrived', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const cleanFieldHeaders = await authenticate(app, 'field.noholds@test.com', 'test');

  await t.test('sets arrivedAt and flips subjectStatus on pre-transfer holds', async () => {
    const response = await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/arrived`)
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const preTransferHolds = await prisma.deflection.findMany({
      where: {
        facilityId: FACILITY_ID,
        currentOfficerId: USER2_ID,
        status: 'ACTIVE',
        subjectStatus: 'ONSITE_AWAITING_TRANSFER',
      },
    });
    assert.ok(preTransferHolds.length >= 2, 'expected at least two holds flipped to ONSITE_AWAITING_TRANSFER');
    for (const hold of preTransferHolds) {
      assert.ok(hold.arrivedAt, `deflection ${hold.id} should have arrivedAt set`);
    }

    // Post-transfer holds (READY_FOR_INTAKE / RELEASED) must not be touched.
    const untouched = await prisma.deflection.findFirst({
      where: { id: 6, currentOfficerId: USER2_ID },
    });
    assert.deepStrictEqual(untouched.subjectStatus, 'READY_FOR_INTAKE');
    assert.deepStrictEqual(untouched.arrivedAt, null);
  });

  await t.test('writes a deflectionUpdate audit row per affected hold', async () => {
    const beforeCount = await prisma.deflectionUpdate.count({
      where: { updatedById: USER2_ID, subjectStatus: 'ONSITE_AWAITING_TRANSFER' },
    });

    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/arrived`)
      .headers(userHeaders);

    const afterCount = await prisma.deflectionUpdate.count({
      where: { updatedById: USER2_ID, subjectStatus: 'ONSITE_AWAITING_TRANSFER' },
    });
    assert.ok(afterCount >= beforeCount + 2, 'expected an update row per pre-transfer hold');
  });

  await t.test('records an ARRIVAL FacilityCheckIn with the affected hold ids', async () => {
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/arrived`)
      .headers(userHeaders);

    const checkIn = await prisma.facilityCheckIn.findFirst({
      where: { userId: USER2_ID, facilityId: FACILITY_ID, eventType: 'ARRIVAL' },
      orderBy: { timestamp: 'desc' },
    });
    assert.ok(checkIn, 'expected an ARRIVAL check-in row');
    assert.ok(checkIn.arrivedWithDeflectionIds.includes(4));
    assert.ok(checkIn.arrivedWithDeflectionIds.includes(5));
  });

  await t.test('returns 400 when the caller has no eligible holds at this facility', async () => {
    const response = await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/arrived`)
      .headers(cleanFieldHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
  });

  await t.test('ignores holds at a different facility', async () => {
    // user2 has no holds at OTHER_FACILITY_ID, so this should be a no-op / 400.
    const response = await app.inject()
      .post(`/api/facilities/${OTHER_FACILITY_ID}/arrived`)
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
  });

  await t.test('requires authentication', async () => {
    const response = await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/arrived`);
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });
});
