import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/deflections/:id/handoff', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  // user2 = regular.user (FIELD, created incident1 with deflections)
  // user4 = another.user (FIELD, created incident2 with deflections)
  // fielduser1 = field.noholds (FIELD, no incidents or deflections)
  const user2Headers = await authenticate(app, 'regular.user@test.com', 'test');
  const user4Headers = await authenticate(app, 'another.user@test.com', 'test');
  const cleanFieldHeaders = await authenticate(app, 'field.noholds@test.com', 'test');

  // Helper: make an incident handoff-ready (fill in required details)
  async function makeIncidentComplete (incidentId) {
    await prisma.incident.updateMany({
      where: { id: incidentId },
      data: {
        addressLine1: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        supervisorBadgeNumber: '1234',
      },
    });
  }

  await t.test('successful handoff', async () => {
    // incident2 is created by user4, deflection1 is active on incident2
    await makeIncidentComplete(2);
    const deflection = await prisma.deflection.findFirst({
      where: { incidentId: 2, status: 'ACTIVE', currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1' },
    });
    assert.ok(deflection, 'Expected an active deflection on incident2');

    // Owner must initiate handoff first
    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { handoffReadyAt: new Date() },
    });

    const response = await app.inject()
      .post(`/api/deflections/${deflection.id}/handoff`)
      .headers(cleanFieldHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    // Verify currentOfficerId changed to fielduser1
    const updated = await prisma.deflection.findUnique({ where: { id: deflection.id } });
    assert.deepStrictEqual(updated.currentOfficerId, '7a8b9c0d-1e2f-4a4b-8c6d-7e8f9a0b1c2d');

    // Verify handoffReadyAt is cleared after successful handoff
    assert.deepStrictEqual(updated.handoffReadyAt, null);

    // Verify Handoff row created for this deflection
    const handoff = await prisma.handoff.findFirst({
      where: { deflectionId: deflection.id },
      orderBy: { timestamp: 'desc' },
    });
    assert.ok(handoff);
    assert.deepStrictEqual(handoff.fromOfficerId, 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1');
    assert.deepStrictEqual(handoff.toOfficerId, '7a8b9c0d-1e2f-4a4b-8c6d-7e8f9a0b1c2d');

    // Cleanup: hand it back
    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1', handoffReadyAt: null },
    });
    await prisma.handoff.deleteMany({
      where: { deflectionId: deflection.id },
    });
  });

  await t.test('competing handoff acceptances allow exactly one winner', async () => {
    await makeIncidentComplete(2);
    const deflection = await prisma.deflection.findFirst({
      where: { incidentId: 2, status: 'ACTIVE', currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1' },
    });
    assert.ok(deflection, 'Expected an active deflection on incident2');

    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { handoffReadyAt: new Date() },
    });

    const [user2Response, cleanFieldResponse] = await Promise.all([
      app.inject()
        .post(`/api/deflections/${deflection.id}/handoff`)
        .headers(user2Headers),
      app.inject()
        .post(`/api/deflections/${deflection.id}/handoff`)
        .headers(cleanFieldHeaders),
    ]);

    const successResponses = [user2Response, cleanFieldResponse].filter((response) => response.statusCode === StatusCodes.OK);
    const rejectedResponses = [user2Response, cleanFieldResponse].filter((response) => response.statusCode === StatusCodes.UNPROCESSABLE_ENTITY);

    assert.deepStrictEqual(successResponses.length, 1);
    assert.deepStrictEqual(rejectedResponses.length, 1);

    const updated = await prisma.deflection.findUnique({ where: { id: deflection.id } });
    const handoffs = await prisma.handoff.findMany({
      where: { deflectionId: deflection.id },
      orderBy: { timestamp: 'desc' },
    });

    assert.deepStrictEqual(handoffs.length, 1);
    assert.deepStrictEqual(handoffs[0].toOfficerId, updated.currentOfficerId);
    assert.deepStrictEqual(updated.handoffReadyAt, null);

    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1', handoffReadyAt: null },
    });
    await prisma.handoff.deleteMany({
      where: { deflectionId: deflection.id },
    });
  });

  await t.test('handoff rejected when not initiated by owner', async () => {
    await makeIncidentComplete(2);
    const deflection = await prisma.deflection.findFirst({
      where: { incidentId: 2, status: 'ACTIVE', currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1' },
    });
    assert.ok(deflection);

    // handoffReadyAt is null — owner has not initiated handoff
    const response = await app.inject()
      .post(`/api/deflections/${deflection.id}/handoff`)
      .headers(cleanFieldHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    const body = JSON.parse(response.body);
    assert.ok(body.errors[0].message.includes('not available for handoff'));
  });

  await t.test('handoff rejected when handoff initiation expired', async () => {
    await makeIncidentComplete(2);
    const deflection = await prisma.deflection.findFirst({
      where: { incidentId: 2, status: 'ACTIVE', currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1' },
    });
    assert.ok(deflection);

    // Set handoffReadyAt to 4 minutes ago (beyond the 3-minute TTL)
    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { handoffReadyAt: new Date(Date.now() - 4 * 60 * 1000) },
    });

    const response = await app.inject()
      .post(`/api/deflections/${deflection.id}/handoff`)
      .headers(cleanFieldHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    const body = JSON.parse(response.body);
    assert.ok(body.errors[0].message.includes('not available for handoff'));

    // Cleanup
    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { handoffReadyAt: null },
    });
  });

  await t.test('cannot handoff to yourself', async () => {
    await makeIncidentComplete(2);
    const deflection = await prisma.deflection.findFirst({
      where: { incidentId: 2, status: 'ACTIVE', currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1' },
    });

    const response = await app.inject()
      .post(`/api/deflections/${deflection.id}/handoff`)
      .headers(user4Headers);

    assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    const body = JSON.parse(response.body);
    assert.ok(body.errors[0].message.includes('already control'));
  });

  await t.test('hold does not exist', async () => {
    const response = await app.inject()
      .post('/api/deflections/99999/handoff')
      .headers(user2Headers);

    assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    const body = JSON.parse(response.body);
    assert.ok(body.errors[0].message.includes('not recognized'));
  });

  await t.test('hold is not active', async () => {
    // deflection3 is CANCELLED
    const deflection = await prisma.deflection.findFirst({
      where: { incidentId: 2, status: 'CANCELLED' },
    });
    assert.ok(deflection);

    const response = await app.inject()
      .post(`/api/deflections/${deflection.id}/handoff`)
      .headers(user2Headers);

    assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    const body = JSON.parse(response.body);
    assert.ok(body.errors[0].message.includes('no longer active'));
  });

  await t.test('receiving officer may already hold deflections on a different incident', async () => {
    await makeIncidentComplete(1);
    await makeIncidentComplete(2);

    // user2 has active holds on incident1; the cross-incident constraint was
    // removed, so accepting a handoff from incident2 should succeed.
    const deflection = await prisma.deflection.findFirst({
      where: { incidentId: 2, status: 'ACTIVE', currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1' },
    });

    // Owner must initiate handoff first
    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { handoffReadyAt: new Date() },
    });

    const response = await app.inject()
      .post(`/api/deflections/${deflection.id}/handoff`)
      .headers(user2Headers);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const updated = await prisma.deflection.findUnique({ where: { id: deflection.id } });
    assert.deepStrictEqual(updated.currentOfficerId, 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5');
    assert.deepStrictEqual(updated.handoffReadyAt, null);

    // Cleanup: hand it back
    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1', handoffReadyAt: null },
    });
    await prisma.handoff.deleteMany({
      where: { deflectionId: deflection.id },
    });
  });

  await t.test('incident details incomplete blocks handoff', async () => {
    // Reset incident2 to incomplete
    await prisma.incident.updateMany({
      where: { id: 2 },
      data: { supervisorBadgeNumber: null },
    });

    const deflection = await prisma.deflection.findFirst({
      where: { incidentId: 2, status: 'ACTIVE', currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1' },
    });

    const response = await app.inject()
      .post(`/api/deflections/${deflection.id}/handoff`)
      .headers(cleanFieldHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    const body = JSON.parse(response.body);
    assert.ok(body.errors[0].message.includes('Incident details must be complete'));

    // Restore
    await makeIncidentComplete(2);
  });

  await t.test('QR is one-time use: replay after success is rejected', async () => {
    await makeIncidentComplete(2);

    const deflection = await prisma.deflection.findFirst({
      where: { incidentId: 2, status: 'ACTIVE', currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1' },
    });
    assert.ok(deflection);

    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { handoffReadyAt: new Date() },
    });

    const first = await app.inject()
      .post(`/api/deflections/${deflection.id}/handoff`)
      .headers(cleanFieldHeaders);
    assert.deepStrictEqual(first.statusCode, StatusCodes.OK);

    const afterFirst = await prisma.deflection.findUnique({ where: { id: deflection.id } });
    assert.deepStrictEqual(afterFirst.handoffReadyAt, null);

    // Former owner rescans the same QR — must fail on the cleared handoffReadyAt
    const replay = await app.inject()
      .post(`/api/deflections/${deflection.id}/handoff`)
      .headers(user4Headers);
    assert.deepStrictEqual(replay.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    const body = JSON.parse(replay.body);
    assert.ok(body.errors[0].message.includes('not available for handoff'));
  });

  await t.test('concurrent handoffs: only one succeeds, audit trail has exactly one row', async () => {
    await makeIncidentComplete(2);

    const deflection = await prisma.deflection.findFirst({
      where: { incidentId: 2, status: 'ACTIVE', currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1' },
    });
    assert.ok(deflection);

    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { handoffReadyAt: new Date() },
    });

    const auditBefore = await prisma.deflectionUpdate.count({ where: { deflectionId: deflection.id } });

    const [r1, r2] = await Promise.all([
      app.inject().post(`/api/deflections/${deflection.id}/handoff`).headers(cleanFieldHeaders),
      app.inject().post(`/api/deflections/${deflection.id}/handoff`).headers(cleanFieldHeaders),
    ]);

    const codes = [r1.statusCode, r2.statusCode].sort();
    assert.deepStrictEqual(codes, [StatusCodes.OK, StatusCodes.UNPROCESSABLE_ENTITY]);

    const auditAfter = await prisma.deflectionUpdate.count({ where: { deflectionId: deflection.id } });
    assert.deepStrictEqual(auditAfter - auditBefore, 1);

    const updated = await prisma.deflection.findUnique({ where: { id: deflection.id } });
    assert.deepStrictEqual(updated.currentOfficerId, '7a8b9c0d-1e2f-4a4b-8c6d-7e8f9a0b1c2d');
    assert.deepStrictEqual(updated.handoffReadyAt, null);
  });
});
