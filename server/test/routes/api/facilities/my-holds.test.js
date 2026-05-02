import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build, makeFixturePreTransferDetailsComplete } from '#test/helper.js';

// Fixture layout:
//   user2 (regular.user) created incident1 at lescFacility1 with:
//     deflection4 DETAINED, deflection5 DETAINED, deflection6 READY_FOR_INTAKE, deflection7 RELEASED
//   user4 (another.user) created incident2 at lescFacility1 (deflections owned by user4)
const FACILITY_ID = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
const OTHER_FACILITY_ID = 'fab67d53-a1c7-4eb5-b151-33727270ad20';
const USER2_ID = 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5';

test('GET /api/facilities/:facilityId/my-holds', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const cleanFieldHeaders = await authenticate(app, 'field.noholds@test.com', 'test');

  async function getBody (headers, facilityId = FACILITY_ID) {
    const response = await app.inject()
      .get(`/api/facilities/${facilityId}/my-holds`)
      .headers(headers);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    return JSON.parse(response.body);
  }

  await t.test('returns only caller\'s pre-transfer holds at the facility, grouped by incident', async () => {
    const body = await getBody(userHeaders);

    assert.deepStrictEqual(body.incidents.length, 1);
    const [incident] = body.incidents;
    assert.deepStrictEqual(incident.id, 1);

    const returnedIds = incident.deflections.map(d => d.id).sort();
    assert.deepStrictEqual(returnedIds, [4, 5], 'only DETAINED holds (4, 5) should be returned');

    for (const d of incident.deflections) {
      assert.deepStrictEqual(d.currentOfficerId, USER2_ID);
      assert.deepStrictEqual(d.status, 'ACTIVE');
      assert.ok(['DETAINED', 'ONSITE_AWAITING_TRANSFER'].includes(d.subjectStatus));
    }
  });

  await t.test('canEdit reflects incident creator; activeIncidentId points to caller\'s own incident', async () => {
    const body = await getBody(userHeaders);
    assert.deepStrictEqual(body.activeIncidentId, 1);
    assert.deepStrictEqual(body.incidents[0].canEdit, true);
  });

  await t.test('canHandoff is false until both incident and hold details are complete', async () => {
    const before = await getBody(userHeaders);
    assert.deepStrictEqual(before.incidents[0].canHandoff, false);

    await prisma.incident.updateMany({
      where: { id: 1 },
      data: {
        addressLine1: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        supervisorBadgeNumber: '1234',
      },
    });

    const incidentOnly = await getBody(userHeaders);
    assert.deepStrictEqual(incidentOnly.incidents[0].canHandoff, false);

    await makeFixturePreTransferDetailsComplete(prisma);

    const after = await getBody(userHeaders);
    assert.deepStrictEqual(after.incidents[0].canHandoff, true);
  });

  await t.test('with pre-transfer holds and not arrived: atFacility false, arrivedAt null, canArrive + canExtend + canCreateHold true, canLeave false', async () => {
    await makeFixturePreTransferDetailsComplete(prisma);

    const body = await getBody(userHeaders);
    assert.deepStrictEqual(body.atFacility, false);
    assert.deepStrictEqual(body.arrivedAt, null);
    assert.deepStrictEqual(body.canArrive, true);
    assert.deepStrictEqual(body.canLeave, false);
    assert.deepStrictEqual(body.canExtend, true);
    assert.deepStrictEqual(body.canCreateHold, true);
  });

  await t.test('after arriving: atFacility true, arrivedAt populated; canArrive / canCreateHold / canExtend all false; canLeave still false (pre-transfer holds remain)', async () => {
    await makeFixturePreTransferDetailsComplete(prisma);

    const before = Date.now();
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/arrived`)
      .headers(userHeaders);

    const body = await getBody(userHeaders);
    assert.deepStrictEqual(body.atFacility, true);
    assert.ok(body.arrivedAt, 'arrivedAt should be populated');
    const arrivedAtMs = new Date(body.arrivedAt).getTime();
    assert.ok(arrivedAtMs >= before && arrivedAtMs <= Date.now(), 'arrivedAt should fall within the request window');
    assert.deepStrictEqual(body.canArrive, false);
    assert.deepStrictEqual(body.canCreateHold, false);
    // All pre-transfer holds are now ONSITE_AWAITING_TRANSFER (no DETAINED remaining).
    assert.deepStrictEqual(body.canExtend, false);
    // Still has pre-transfer holds, so can't leave yet.
    assert.deepStrictEqual(body.canLeave, false);
  });

  await t.test('atFacility true + canLeave true once caller is arrived and has no pre-transfer holds', async () => {
    await makeFixturePreTransferDetailsComplete(prisma);

    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/arrived`)
      .headers(userHeaders);

    // Move the arrived holds past pre-transfer (simulate intake completing).
    await prisma.deflection.updateMany({
      where: { currentOfficerId: USER2_ID, facilityId: FACILITY_ID, status: 'ACTIVE' },
      data: { subjectStatus: 'READY_FOR_INTAKE' },
    });

    const body = await getBody(userHeaders);
    assert.deepStrictEqual(body.incidents.length, 0, 'no pre-transfer holds means no incident groups');
    assert.deepStrictEqual(body.atFacility, true);
    assert.ok(body.arrivedAt, 'arrivedAt should still be populated');
    assert.deepStrictEqual(body.canLeave, true);
    assert.deepStrictEqual(body.canArrive, false);
    assert.deepStrictEqual(body.canCreateHold, false);
  });

  await t.test('after leaving: atFacility flips back to false, arrivedAt null', async () => {
    await makeFixturePreTransferDetailsComplete(prisma);

    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/arrived`)
      .headers(userHeaders);
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/left`)
      .headers(userHeaders);

    const body = await getBody(userHeaders);
    assert.deepStrictEqual(body.atFacility, false);
    assert.deepStrictEqual(body.arrivedAt, null);
  });

  await t.test('empty response and permissive flags when caller has no holds anywhere', async () => {
    const body = await getBody(cleanFieldHeaders);
    assert.deepStrictEqual(body.incidents.length, 0);
    assert.deepStrictEqual(body.activeIncidentId, null);
    assert.deepStrictEqual(body.atFacility, false);
    assert.deepStrictEqual(body.arrivedAt, null);
    assert.deepStrictEqual(body.canArrive, false);
    assert.deepStrictEqual(body.canLeave, false);
    assert.deepStrictEqual(body.canExtend, false);
    assert.deepStrictEqual(body.canCreateHold, true);
  });

  await t.test('scopes results to the requested facility', async () => {
    const body = await getBody(userHeaders, OTHER_FACILITY_ID);
    assert.deepStrictEqual(body.incidents.length, 0);
  });

  await t.test('requires authentication', async () => {
    const response = await app.inject().get(`/api/facilities/${FACILITY_ID}/my-holds`);
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });
});
