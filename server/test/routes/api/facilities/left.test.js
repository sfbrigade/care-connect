import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

const FACILITY_ID = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
const USER2_ID = 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5';

test('POST /api/facilities/:facilityId/left', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const cleanFieldHeaders = await authenticate(app, 'field.noholds@test.com', 'test');

  await t.test('clears currentOfficerId on this officer\'s arrived holds', async () => {
    // Arrive first so there's something to leave.
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/arrived`)
      .headers(userHeaders);

    const arrivedBefore = await prisma.deflection.findMany({
      where: { facilityId: FACILITY_ID, currentOfficerId: USER2_ID, arrivedAt: { not: null } },
      select: { id: true },
    });
    assert.ok(arrivedBefore.length > 0, 'precondition: arrived holds exist');
    const arrivedIds = arrivedBefore.map(h => h.id);

    const response = await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/left`)
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    for (const id of arrivedIds) {
      const deflection = await prisma.deflection.findUnique({ where: { id } });
      assert.deepStrictEqual(deflection.currentOfficerId, null, `deflection ${id} should have no current officer`);
      assert.ok(deflection.arrivedAt, `deflection ${id} should retain arrivedAt`);
    }
  });

  await t.test('does not clear ownership of holds without arrivedAt', async () => {
    // Without a prior /arrived, user2's active pre-transfer holds have no arrivedAt.
    const preCount = await prisma.deflection.count({
      where: { facilityId: FACILITY_ID, currentOfficerId: USER2_ID, arrivedAt: null },
    });
    assert.ok(preCount > 0);

    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/left`)
      .headers(userHeaders);

    const stillOwned = await prisma.deflection.count({
      where: { facilityId: FACILITY_ID, currentOfficerId: USER2_ID, arrivedAt: null },
    });
    assert.deepStrictEqual(stillOwned, preCount);
  });

  await t.test('records a DEPARTURE FacilityCheckIn', async () => {
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/left`)
      .headers(userHeaders);

    const checkIn = await prisma.facilityCheckIn.findFirst({
      where: { userId: USER2_ID, facilityId: FACILITY_ID, eventType: 'DEPARTURE' },
      orderBy: { timestamp: 'desc' },
    });
    assert.ok(checkIn, 'expected a DEPARTURE check-in row');
  });

  await t.test('is idempotent / still succeeds when there\'s nothing to leave', async () => {
    const response = await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/left`)
      .headers(cleanFieldHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
  });

  await t.test('requires authentication', async () => {
    const response = await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/left`);
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });
});
