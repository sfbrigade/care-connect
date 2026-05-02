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
  t.beforeEach(async () => {
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
  });

  await t.test('400 when not called on a facility subdomain', async () => {
    const response = await app.inject()
      .get('/api/status/capacity');
    assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
  });

  await t.test('401 when Authorization header missing', async () => {
    const response = await app.inject()
      .get('/api/status/capacity')
      .headers({ host: 'reset.localhost' });
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('401 when Bearer token is wrong', async () => {
    const response = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: 'Bearer not-the-right-token', host: 'reset.localhost' });
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('401 when auth scheme is not Bearer', async () => {
    const response = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: `Basic ${TEST_API_KEY}`, host: 'reset.localhost' });
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('200 with correct token; response shape is valid', async () => {
    const response = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: `Bearer ${TEST_API_KEY}`, host: 'reset.localhost' });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const body = JSON.parse(response.body);

    assert.deepStrictEqual(body.facility, 'RESET (test)');
    assert.ok(body.generatedAt);
    assert.ok(body.beds);
    assert.deepStrictEqual(typeof body.beds.total, 'number');
    assert.deepStrictEqual(typeof body.beds.operational, 'number');
    assert.deepStrictEqual(typeof body.beds.occupied, 'number');
    assert.deepStrictEqual(typeof body.beds.inTransit, 'number');
    assert.ok(Array.isArray(body.occupants));
    // Note: body.occupants and body.beds.occupied represent different sets and
    // are not expected to be equal in general. Occupants is "admitted within
    // last 24h"; occupied is "at the facility, not in transit." See
    // routes/api/status/capacity.js for the full boundary definitions.

    for (const occ of body.occupants) {
      assert.deepStrictEqual(Object.keys(occ).sort(), ['admittedAt', 'exitedAt', 'releasedAt']);
      assert.ok(occ.admittedAt === null || typeof occ.admittedAt === 'string');
      assert.ok(occ.releasedAt === null || typeof occ.releasedAt === 'string');
      assert.ok(occ.exitedAt === null || typeof occ.exitedAt === 'string');
    }
  });

  await t.test('successive requests within TTL return cached snapshot', async () => {
    const first = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: `Bearer ${TEST_API_KEY}`, host: 'reset.localhost' });
    const second = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: `Bearer ${TEST_API_KEY}`, host: 'reset.localhost' });

    const firstBody = JSON.parse(first.body);
    const secondBody = JSON.parse(second.body);

    assert.deepStrictEqual(firstBody.generatedAt, secondBody.generatedAt);
  });

  await t.test('Cache-Control header is set', async () => {
    const response = await app.inject()
      .get('/api/status/capacity')
      .headers({ authorization: `Bearer ${TEST_API_KEY}`, host: 'reset.localhost' });
    assert.ok(response.headers['cache-control'].includes('max-age=30'));
  });
});
