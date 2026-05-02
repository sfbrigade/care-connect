import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build, makeFixturePreTransferDetailsComplete } from '#test/helper.js';

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
  const custodyUserHeaders = await authenticate(app, 'sfsouser1@test.com', 'test');

  await t.test('sets arrivedAt and flips subjectStatus on pre-transfer holds', async () => {
    await makeFixturePreTransferDetailsComplete(prisma);

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
    await makeFixturePreTransferDetailsComplete(prisma);

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
    await makeFixturePreTransferDetailsComplete(prisma);

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

  await t.test('preserves existing arrivedAt timestamps on already-onsite holds', async () => {
    const originalArrivedAt = new Date('2024-01-01T12:00:00.000Z');
    const bedType = await prisma.bedType.findFirst({
      where: { facilityId: OTHER_FACILITY_ID },
    });
    const incident = await prisma.incident.create({
      data: {
        facilityId: OTHER_FACILITY_ID,
        encounteredVia: 'DISPATCHED',
        cadNumber: `CAD-ARRIVED-${Date.now()}`,
        caseNumber: `CASE-ARRIVED-${Date.now()}`,
        addressLine1: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        arrestedAt: new Date('2024-01-01T07:00:00.000Z'),
        supervisorBadgeNumber: '1234',
        createdById: USER2_ID,
        updatedById: USER2_ID,
      },
    });
    const subject = await prisma.subject.create({
      data: {
        firstName: 'Test',
        lastName: 'Arrived',
        dateOfBirth: new Date('2000-01-01T00:00:00.000Z'),
        sex: 'MALE',
        race: 'WHITE',
      },
    });
    const deflection = await prisma.deflection.create({
      data: {
        facilityId: OTHER_FACILITY_ID,
        incidentId: incident.id,
        bedTypeId: bedType.id,
        subjectId: subject.id,
        currentOfficerId: USER2_ID,
        subjectStatus: 'ONSITE_AWAITING_TRANSFER',
        arrivedAt: originalArrivedAt,
        narcoticsSubstance: false,
        narcoticsParaphernalia: false,
        drugUseEvidence: false,
        behavior: 'Cooperative',
        behaviorNarrative: 'Test narrative',
        chargeType: 'RWS_647F',
        property: 'NONE',
        certifiedAt: new Date(),
        createdById: USER2_ID,
      },
    });

    const response = await app.inject()
      .post(`/api/facilities/${OTHER_FACILITY_ID}/arrived`)
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const updated = await prisma.deflection.findUnique({
      where: { id: deflection.id },
    });
    const updates = await prisma.deflectionUpdate.findMany({
      where: {
        deflectionId: deflection.id,
        updatedById: USER2_ID,
        subjectStatus: 'ONSITE_AWAITING_TRANSFER',
      },
    });

    assert.deepStrictEqual(updated.arrivedAt?.toISOString(), originalArrivedAt.toISOString());
    assert.deepStrictEqual(updates.length, 0);
  });

  await t.test('concurrent arrived vs cancel excludes holds cancelled before arrival commits', async () => {
    const startedAt = new Date();
    const bedType = await prisma.bedType.findFirst({
      where: { facilityId: OTHER_FACILITY_ID },
    });
    const incident = await prisma.incident.create({
      data: {
        facilityId: OTHER_FACILITY_ID,
        encounteredVia: 'DISPATCHED',
        cadNumber: `CAD-ARR-CANCEL-${Date.now()}`,
        caseNumber: `CASE-ARR-CANCEL-${Date.now()}`,
        createdById: USER2_ID,
        updatedById: USER2_ID,
      },
    });
    const deflection = await prisma.deflection.create({
      data: {
        facilityId: OTHER_FACILITY_ID,
        incidentId: incident.id,
        bedTypeId: bedType.id,
        currentOfficerId: USER2_ID,
        subjectStatus: 'DETAINED',
        createdById: USER2_ID,
      },
    });

    const [arrivedResponse, cancelResponse] = await Promise.all([
      app.inject()
        .post(`/api/facilities/${OTHER_FACILITY_ID}/arrived`)
        .headers(userHeaders),
      app.inject()
        .delete(`/api/deflections/${deflection.id}?cancelReasonId=5150`)
        .headers(userHeaders),
    ]);

    assert.ok([StatusCodes.OK, StatusCodes.BAD_REQUEST].includes(arrivedResponse.statusCode));
    assert.deepStrictEqual(cancelResponse.statusCode, StatusCodes.OK);

    const checkIn = await prisma.facilityCheckIn.findFirst({
      where: {
        userId: USER2_ID,
        facilityId: OTHER_FACILITY_ID,
        eventType: 'ARRIVAL',
        timestamp: { gte: startedAt },
      },
      orderBy: { timestamp: 'desc' },
    });
    const updated = await prisma.deflection.findUnique({
      where: { id: deflection.id },
    });

    if (checkIn?.arrivedWithDeflectionIds.includes(deflection.id)) {
      assert.ok(updated.cancelledAt > checkIn.timestamp);
    }
  });

  await t.test('concurrent arrived vs transfer excludes holds transferred before arrival commits', async () => {
    const startedAt = new Date();
    const originalArrivedAt = new Date('2024-01-01T08:00:00.000Z');
    const bedType = await prisma.bedType.findFirst({
      where: { facilityId: OTHER_FACILITY_ID },
    });
    const incident = await prisma.incident.create({
      data: {
        facilityId: OTHER_FACILITY_ID,
        encounteredVia: 'DISPATCHED',
        cadNumber: `CAD-ARR-TRANSFER-${Date.now()}`,
        caseNumber: `CASE-ARR-TRANSFER-${Date.now()}`,
        addressLine1: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        arrestedAt: new Date('2024-01-01T07:00:00.000Z'),
        supervisorBadgeNumber: '1234',
        createdById: USER2_ID,
        updatedById: USER2_ID,
      },
    });
    const subject = await prisma.subject.create({
      data: {
        firstName: 'Test',
        lastName: 'Transfer',
        dateOfBirth: new Date('2000-01-01T00:00:00.000Z'),
        sex: 'MALE',
        race: 'WHITE',
      },
    });
    const deflection = await prisma.deflection.create({
      data: {
        facilityId: OTHER_FACILITY_ID,
        incidentId: incident.id,
        bedTypeId: bedType.id,
        subjectId: subject.id,
        currentOfficerId: USER2_ID,
        subjectStatus: 'ONSITE_AWAITING_TRANSFER',
        arrivedAt: originalArrivedAt,
        narcoticsSubstance: false,
        narcoticsParaphernalia: false,
        drugUseEvidence: false,
        behavior: 'Cooperative',
        behaviorNarrative: 'Test narrative',
        chargeType: 'RWS_647F',
        property: 'NONE',
        certifiedAt: new Date(),
        createdById: USER2_ID,
      },
    });

    const [arrivedResponse, transferResponse] = await Promise.all([
      app.inject()
        .post(`/api/facilities/${OTHER_FACILITY_ID}/arrived`)
        .headers(userHeaders),
      app.inject()
        .post(`/api/deflections/${deflection.id}/transfer`)
        .headers(custodyUserHeaders),
    ]);

    assert.ok([StatusCodes.OK, StatusCodes.BAD_REQUEST].includes(arrivedResponse.statusCode));
    assert.ok([StatusCodes.OK, StatusCodes.CONFLICT].includes(transferResponse.statusCode));

    const checkIn = await prisma.facilityCheckIn.findFirst({
      where: {
        userId: USER2_ID,
        facilityId: OTHER_FACILITY_ID,
        eventType: 'ARRIVAL',
        timestamp: { gte: startedAt },
      },
      orderBy: { timestamp: 'desc' },
    });
    const updated = await prisma.deflection.findUnique({
      where: { id: deflection.id },
    });

    if (checkIn?.arrivedWithDeflectionIds.includes(deflection.id) && updated.transferredAt) {
      assert.ok(updated.transferredAt > checkIn.timestamp);
    }
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
