import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/deflections/initiate-handoff', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  // user2 = regular.user (FIELD, owns active deflections on incident1)
  // user4 = another.user (FIELD, owns active deflections on incident2)
  // fielduser1 = field.noholds (FIELD, no deflections)
  const user4Headers = await authenticate(app, 'another.user@test.com', 'test');
  const cleanFieldHeaders = await authenticate(app, 'field.noholds@test.com', 'test');

  await t.test('sets handoffReadyAt on all active deflections for the caller', async () => {
    const response = await app.inject()
      .post('/api/deflections/initiate-handoff')
      .headers(user4Headers)
      .payload({ active: true });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const body = JSON.parse(response.body);
    assert.deepStrictEqual(body.ok, true);

    // user4's active deflections should have handoffReadyAt set
    const deflections = await prisma.deflection.findMany({
      where: { currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1', status: 'ACTIVE' },
    });
    for (const d of deflections) {
      assert.ok(d.handoffReadyAt, `deflection ${d.id} should have handoffReadyAt set`);
    }

    // Cleanup
    await prisma.deflection.updateMany({
      where: { currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1' },
      data: { handoffReadyAt: null },
    });
  });

  await t.test('clears handoffReadyAt when active is false', async () => {
    // Set handoffReadyAt first
    await prisma.deflection.updateMany({
      where: { currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1', status: 'ACTIVE' },
      data: { handoffReadyAt: new Date() },
    });

    const response = await app.inject()
      .post('/api/deflections/initiate-handoff')
      .headers(user4Headers)
      .payload({ active: false });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const deflections = await prisma.deflection.findMany({
      where: { currentOfficerId: 'aa1fdcf6-a63c-454e-9775-2d6fd116fdb1', status: 'ACTIVE' },
    });
    for (const d of deflections) {
      assert.deepStrictEqual(d.handoffReadyAt, null, `deflection ${d.id} should have handoffReadyAt cleared`);
    }
  });

  await t.test('does not affect other officers deflections', async () => {
    // Set handoffReadyAt on user2's deflections first
    await prisma.deflection.updateMany({
      where: { currentOfficerId: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5', status: 'ACTIVE' },
      data: { handoffReadyAt: new Date() },
    });

    // user4 initiates handoff-ready
    await app.inject()
      .post('/api/deflections/initiate-handoff')
      .headers(user4Headers)
      .payload({ active: false });

    // user2's deflections should still have handoffReadyAt set
    const user2Deflections = await prisma.deflection.findMany({
      where: { currentOfficerId: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5', status: 'ACTIVE' },
    });
    for (const d of user2Deflections) {
      assert.ok(d.handoffReadyAt, `user2's deflection ${d.id} should still have handoffReadyAt set`);
    }

    // Cleanup
    await prisma.deflection.updateMany({
      where: { currentOfficerId: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' },
      data: { handoffReadyAt: null },
    });
  });

  await t.test('succeeds even when officer has no deflections', async () => {
    const response = await app.inject()
      .post('/api/deflections/initiate-handoff')
      .headers(cleanFieldHeaders)
      .payload({ active: true });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
  });
});
