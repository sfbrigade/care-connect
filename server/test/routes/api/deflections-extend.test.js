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

    assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
  });

  await t.test('returns 400 when none of the requested holds are eligible', async () => {
    const response = await app.inject()
      .patch('/api/deflections/extend')
      .headers(cleanFieldHeaders)
      .payload({ deflectionIds: [4, 5] });

    assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
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
