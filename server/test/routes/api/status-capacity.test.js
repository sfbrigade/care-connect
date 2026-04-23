import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { build } from '#test/helper.js';

const TEST_API_KEY = 'test-capacity-api-key-do-not-use-in-prod';

test('/api/status/capacity', async (t) => {
  process.env.CAPACITY_API_KEY = TEST_API_KEY;

  const app = await build(t);
  const { prisma } = app;

  // The shared test fixtures don't include a facility with subdomain='reset',
  // and the helper's afterEach recreates the DB from template1 after every
  // subtest — so we re-seed per test that needs it.
  async function seedResetFacility () {
    const user = await prisma.user.findFirst();
    const serviceType = await prisma.serviceType.findFirst();
    await prisma.facility.create({
      data: {
        name: 'RESET (test)',
        subdomain: 'reset',
        type: 'LESC',
        serviceTypeId: serviceType.id,
        createdById: user.id,
        updatedById: user.id,
        bedTypes: {
          create: {
            type: 'CHAIR',
            capacity: 10,
            unavailableUnoccupied: 1,
            unavailableOccupied: 0,
            occupied: 0,
            holds: 0,
            inTransit: 2,
            available: 7,
            createdById: user.id,
            updatedById: user.id,
          },
        },
      },
    });
  }

  await t.test('401 when Authorization header missing', async () => {
    const response = await app.inject()
      .get('/api/status/capacity');
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('401 when Bearer token is wrong', async () => {
    const response = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: 'Bearer not-the-right-token' });
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('401 when auth scheme is not Bearer', async () => {
    const response = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: `Basic ${TEST_API_KEY}` });
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('200 with correct token; response shape is valid', async () => {
    await seedResetFacility();
    const response = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const body = JSON.parse(response.body);

    assert.deepStrictEqual(body.facility, 'RESET');
    assert.ok(body.generatedAt);
    assert.ok(body.beds);
    assert.deepStrictEqual(typeof body.beds.total, 'number');
    assert.deepStrictEqual(typeof body.beds.operational, 'number');
    assert.deepStrictEqual(typeof body.beds.occupied, 'number');
    assert.deepStrictEqual(typeof body.beds.inTransit, 'number');
    assert.ok(Array.isArray(body.occupants));
    assert.deepStrictEqual(body.occupants.length, body.beds.occupied);

    for (const occ of body.occupants) {
      assert.deepStrictEqual(Object.keys(occ).sort(), ['occupiedSince', 'substance']);
      assert.ok(occ.occupiedSince === null || typeof occ.occupiedSince === 'string');
      assert.ok(occ.substance === null || typeof occ.substance === 'string');
    }
  });

  await t.test('successive requests within TTL return cached snapshot', async () => {
    const first = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    const second = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });

    const firstBody = JSON.parse(first.body);
    const secondBody = JSON.parse(second.body);

    assert.deepStrictEqual(firstBody.generatedAt, secondBody.generatedAt);
  });

  await t.test('Cache-Control header is set', async () => {
    const response = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: `Bearer ${TEST_API_KEY}` });
    assert.ok(response.headers['cache-control'].includes('max-age=30'));
  });
});
