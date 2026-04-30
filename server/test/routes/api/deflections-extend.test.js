import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

const USER2_ID = 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5';

test('PATCH /api/deflections/extend', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const cleanFieldHeaders = await authenticate(app, 'field.noholds@test.com', 'test');

  await t.test('extends caller-owned DETAINED holds by 90 minutes and increments extensionCount', async () => {
    const before = await prisma.deflection.findMany({
      where: { id: { in: [4, 5] } },
    });
    const beforeById = new Map(before.map(d => [d.id, d]));

    const response = await app.inject()
      .patch('/api/deflections/extend')
      .headers(userHeaders)
      .payload({ deflectionIds: [4, 5] });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const body = JSON.parse(response.body);
    assert.deepStrictEqual(body.length, 2);

    const target = Date.now() + 90 * 60 * 1000;
    for (const d of body) {
      const prior = beforeById.get(d.id);
      assert.deepStrictEqual(d.extensionCount, prior.extensionCount + 1);
      const drift = Math.abs(new Date(d.expiresAt).getTime() - target);
      assert.ok(drift < 5000, `expected expiresAt near +90min for deflection ${d.id}, drift=${drift}ms`);
    }
  });

  await t.test('re-fetch under lock filters out deflections expired between candidate scan and lock', async () => {
    const activeBefore = await prisma.deflection.findMany({
      where: { incidentId: 1, status: 'ACTIVE', subjectStatus: 'DETAINED' },
      orderBy: { id: 'asc' },
    });
    assert.ok(activeBefore.length >= 2, 'test setup expects at least 2 active deflections on incident 1');
    const [toExpire, toExtend] = activeBefore;

    // Simulate the deflection having been expired between extend's candidate scan
    // and its lock acquisition. The re-fetch inside the tx should drop it.
    await prisma.deflection.update({
      where: { id: toExpire.id },
      data: { status: 'EXPIRED' },
    });

    const response = await app.inject()
      .patch('/api/deflections/extend')
      .headers(userHeaders)
      .payload({ deflectionIds: [toExpire.id, toExtend.id] });
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);

    assert.deepStrictEqual(data.length, 1, 'only the still-ACTIVE deflection should be returned');
    assert.deepStrictEqual(data[0].id, toExtend.id);

    // The EXPIRED deflection must not have been touched.
    const expiredAfter = await prisma.deflection.findUnique({ where: { id: toExpire.id } });
    assert.deepStrictEqual(expiredAfter.status, 'EXPIRED');
    assert.deepStrictEqual(expiredAfter.expiresAt.toISOString(), toExpire.expiresAt.toISOString());
    assert.deepStrictEqual(expiredAfter.extensionCount, toExpire.extensionCount);
  });

  await t.test('extend and expire race: no deflection ends up EXPIRED with a future expiresAt', async () => {
    // Push incident 1's active deflections past their expiry so the expire job
    // will want to mark them EXPIRED. Run extend and expire concurrently.
    const pastExpiry = new Date(Date.now() - 60 * 1000);
    const expiredDeflections = await prisma.deflection.updateManyAndReturn({
      where: { incidentId: 1, status: 'ACTIVE' },
      data: { expiresAt: pastExpiry },
    });

    const [extendResponse] = await Promise.all([
      app.inject()
        .patch('/api/deflections/extend')
        .headers(userHeaders)
        .payload({ deflectionIds: expiredDeflections.map(d => d.id) }),
      prisma.deflection.expire(),
    ]);

    assert.deepStrictEqual(extendResponse.statusCode, StatusCodes.OK);

    // Invariant: no deflection can be both EXPIRED and have a future expiresAt.
    // This holds regardless of which side of the race won.
    const now = new Date();
    const deflections = await prisma.deflection.findMany({ where: { incidentId: 1 } });
    for (const deflection of deflections) {
      if (deflection.status === 'EXPIRED') {
        assert.ok(
          deflection.expiresAt <= now,
          `Deflection ${deflection.id} is EXPIRED but expiresAt (${deflection.expiresAt.toISOString()}) is in the future`
        );
      }
    }
  });

  await t.test('writes a deflectionUpdate audit row per extended hold', async () => {
    const beforeCount = await prisma.deflectionUpdate.count({
      where: { deflectionId: { in: [4, 5] }, updatedById: USER2_ID },
    });

    await app.inject()
      .patch('/api/deflections/extend')
      .headers(userHeaders)
      .payload({ deflectionIds: [4, 5] });

    const afterCount = await prisma.deflectionUpdate.count({
      where: { deflectionId: { in: [4, 5] }, updatedById: USER2_ID },
    });
    assert.deepStrictEqual(afterCount, beforeCount + 2);
  });

  await t.test('concurrent duplicate extend requests increment from locked current state', async () => {
    const before = await prisma.deflection.findUnique({
      where: { id: 4 },
    });
    const beforeAuditCount = await prisma.deflectionUpdate.count({
      where: {
        deflectionId: 4,
        updatedById: USER2_ID,
        expiresAt: {
          not: null,
        },
      },
    });

    const [firstResponse, secondResponse] = await Promise.all([
      app.inject()
        .patch('/api/deflections/extend')
        .headers(userHeaders)
        .payload({ deflectionIds: [4] }),
      app.inject()
        .patch('/api/deflections/extend')
        .headers(userHeaders)
        .payload({ deflectionIds: [4] }),
    ]);

    assert.deepStrictEqual(firstResponse.statusCode, StatusCodes.OK);
    assert.deepStrictEqual(secondResponse.statusCode, StatusCodes.OK);

    const updated = await prisma.deflection.findUnique({
      where: { id: 4 },
    });
    const afterAuditCount = await prisma.deflectionUpdate.count({
      where: {
        deflectionId: 4,
        updatedById: USER2_ID,
        expiresAt: {
          not: null,
        },
      },
    });

    assert.deepStrictEqual(updated.extensionCount, before.extensionCount + 2);
    assert.deepStrictEqual(afterAuditCount, beforeAuditCount + 2);
  });

  await t.test('silently skips holds the caller does not own', async () => {
    // user2 requests to extend deflection 1 (owned by user4) along with their own 4.
    const before = await prisma.deflection.findUnique({ where: { id: 1 } });

    const response = await app.inject()
      .patch('/api/deflections/extend')
      .headers(userHeaders)
      .payload({ deflectionIds: [1, 4] });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const body = JSON.parse(response.body);
    assert.deepStrictEqual(body.map(d => d.id), [4], 'only the caller-owned hold should be returned');

    const unchanged = await prisma.deflection.findUnique({ where: { id: 1 } });
    assert.deepStrictEqual(
      unchanged.expiresAt.getTime(),
      before.expiresAt.getTime(),
      'other officer\'s hold should not be touched'
    );
    assert.deepStrictEqual(unchanged.extensionCount, before.extensionCount);
  });

  await t.test('skips non-DETAINED holds (e.g. READY_FOR_INTAKE)', async () => {
    // deflection 6 is ACTIVE but subjectStatus READY_FOR_INTAKE — not eligible.
    const response = await app.inject()
      .patch('/api/deflections/extend')
      .headers(userHeaders)
      .payload({ deflectionIds: [6] });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const body = JSON.parse(response.body);
    assert.deepStrictEqual(body.length, 0);
  });

  await t.test('returns an empty array when none of the requested holds are eligible', async () => {
    const response = await app.inject()
      .patch('/api/deflections/extend')
      .headers(cleanFieldHeaders)
      .payload({ deflectionIds: [4, 5] });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const body = JSON.parse(response.body);
    assert.deepStrictEqual(body.length, 0);
  });

  await t.test('validates deflectionIds is non-empty', async () => {
    const response = await app.inject()
      .patch('/api/deflections/extend')
      .headers(userHeaders)
      .payload({ deflectionIds: [] });

    assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
  });

  await t.test('requires authentication', async () => {
    const response = await app.inject()
      .patch('/api/deflections/extend')
      .payload({ deflectionIds: [4] });
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });
});
