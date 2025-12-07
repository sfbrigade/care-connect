import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import crypto from 'node:crypto';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds - Authorization: User Filtering', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const user1Headers = await authenticate(app, 'regular.user@test.com', 'test');
  const user2Headers = await authenticate(app, 'admin.user@test.com', 'test');

  // Get user IDs
  const user1 = await prisma.user.findUnique({
    where: { email: 'regular.user@test.com' },
  });
  const user2 = await prisma.user.findUnique({
    where: { email: 'admin.user@test.com' },
  });
  const user1Id = user1.id;
  const user2Id = user2.id;

  // Helper function to create test data
  async function createTestData () {
    const facility = await prisma.facility.create({
      data: {
        name: 'Test LESC Facility',
        isActive: true,
      },
    });

    const lescServiceType = await prisma.serviceType.create({
      data: {
        code: 'LESC',
        name: 'LESC Service',
      },
    });

    await prisma.facilityService.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        availableBeds: 10,
        reservedBeds: 0,
      },
    });

    return { facility, lescServiceType };
  }

  await t.test('GET /api/lesc/holds - users only see their own holds', async () => {
    const { facility, lescServiceType } = await createTestData();

    // Create holds for both users
    const user1Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user1Id,
      },
    });

    const user2Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user2Id,
      },
    });

    // User 1 should only see their own hold
    const user1Response = await app.inject().get('/api/lesc/holds').headers(user1Headers);
    assert.deepStrictEqual(user1Response.statusCode, StatusCodes.OK);
    const user1Data = JSON.parse(user1Response.body);
    const user1Found = user1Data.find(h => h.id === user1Hold.id);
    const user2FoundInUser1 = user1Data.find(h => h.id === user2Hold.id);
    assert.ok(user1Found, 'User 1 should see their own hold');
    assert.strictEqual(user2FoundInUser1, undefined, 'User 1 should not see user 2\'s hold');

    // User 2 should only see their own hold
    const user2Response = await app.inject().get('/api/lesc/holds').headers(user2Headers);
    assert.deepStrictEqual(user2Response.statusCode, StatusCodes.OK);
    const user2Data = JSON.parse(user2Response.body);
    const user2Found = user2Data.find(h => h.id === user2Hold.id);
    const user1FoundInUser2 = user2Data.find(h => h.id === user1Hold.id);
    assert.ok(user2Found, 'User 2 should see their own hold');
    assert.strictEqual(user1FoundInUser2, undefined, 'User 2 should not see user 1\'s hold');
  });

  await t.test('GET /api/lesc/holds/:id - users can only get their own holds', async () => {
    const { facility, lescServiceType } = await createTestData();

    const user1Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user1Id,
      },
    });

    const user2Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user2Id,
      },
    });

    // User 1 can get their own hold
    const user1Response = await app.inject().get(`/api/lesc/holds/${user1Hold.id}`).headers(user1Headers);
    assert.deepStrictEqual(user1Response.statusCode, StatusCodes.OK);

    // User 1 cannot get user 2's hold
    const user1ForbiddenResponse = await app.inject().get(`/api/lesc/holds/${user2Hold.id}`).headers(user1Headers);
    assert.deepStrictEqual(user1ForbiddenResponse.statusCode, StatusCodes.FORBIDDEN);

    // User 2 can get their own hold
    const user2Response = await app.inject().get(`/api/lesc/holds/${user2Hold.id}`).headers(user2Headers);
    assert.deepStrictEqual(user2Response.statusCode, StatusCodes.OK);

    // User 2 cannot get user 1's hold
    const user2ForbiddenResponse = await app.inject().get(`/api/lesc/holds/${user1Hold.id}`).headers(user2Headers);
    assert.deepStrictEqual(user2ForbiddenResponse.statusCode, StatusCodes.FORBIDDEN);
  });

  await t.test('GET /api/lesc/holds/:id/qr - users can only generate QR for their own holds', async () => {
    const { facility, lescServiceType } = await createTestData();

    const user1Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user1Id,
      },
    });

    const user2Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user2Id,
      },
    });

    // User 1 can generate QR for their own hold
    const user1Response = await app.inject().get(`/api/lesc/holds/${user1Hold.id}/qr`).headers(user1Headers);
    assert.deepStrictEqual(user1Response.statusCode, StatusCodes.OK);

    // User 1 cannot generate QR for user 2's hold
    const user1ForbiddenResponse = await app.inject().get(`/api/lesc/holds/${user2Hold.id}/qr`).headers(user1Headers);
    assert.deepStrictEqual(user1ForbiddenResponse.statusCode, StatusCodes.FORBIDDEN);

    // User 2 can generate QR for their own hold
    const user2Response = await app.inject().get(`/api/lesc/holds/${user2Hold.id}/qr`).headers(user2Headers);
    assert.deepStrictEqual(user2Response.statusCode, StatusCodes.OK);

    // User 2 cannot generate QR for user 1's hold
    const user2ForbiddenResponse = await app.inject().get(`/api/lesc/holds/${user1Hold.id}/qr`).headers(user2Headers);
    assert.deepStrictEqual(user2ForbiddenResponse.statusCode, StatusCodes.FORBIDDEN);
  });

  await t.test('PATCH /api/lesc/holds/:id/extend - users can only extend their own holds', async () => {
    const { facility, lescServiceType } = await createTestData();

    const user1Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user1Id,
      },
    });

    const user2Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user2Id,
      },
    });

    // User 1 can extend their own hold
    const user1Response = await app.inject().patch(`/api/lesc/holds/${user1Hold.id}/extend`).headers(user1Headers);
    assert.deepStrictEqual(user1Response.statusCode, StatusCodes.OK);

    // User 1 cannot extend user 2's hold
    const user1ForbiddenResponse = await app.inject().patch(`/api/lesc/holds/${user2Hold.id}/extend`).headers(user1Headers);
    assert.deepStrictEqual(user1ForbiddenResponse.statusCode, StatusCodes.FORBIDDEN);

    // User 2 can extend their own hold
    const user2Response = await app.inject().patch(`/api/lesc/holds/${user2Hold.id}/extend`).headers(user2Headers);
    assert.deepStrictEqual(user2Response.statusCode, StatusCodes.OK);

    // User 2 cannot extend user 1's hold
    const user2ForbiddenResponse = await app.inject().patch(`/api/lesc/holds/${user1Hold.id}/extend`).headers(user2Headers);
    assert.deepStrictEqual(user2ForbiddenResponse.statusCode, StatusCodes.FORBIDDEN);
  });

  await t.test('DELETE /api/lesc/holds/:id - users can only cancel their own holds', async () => {
    const { facility, lescServiceType } = await createTestData();

    const user1Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user1Id,
      },
    });

    const user2Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user2Id,
      },
    });

    // User 1 can cancel their own hold
    const user1Response = await app.inject().delete(`/api/lesc/holds/${user1Hold.id}`).headers(user1Headers);
    assert.deepStrictEqual(user1Response.statusCode, StatusCodes.OK);

    // User 1 cannot cancel user 2's hold
    const user1ForbiddenResponse = await app.inject().delete(`/api/lesc/holds/${user2Hold.id}`).headers(user1Headers);
    assert.deepStrictEqual(user1ForbiddenResponse.statusCode, StatusCodes.FORBIDDEN);

    // User 2 can cancel their own hold
    const user2Response = await app.inject().delete(`/api/lesc/holds/${user2Hold.id}`).headers(user2Headers);
    assert.deepStrictEqual(user2Response.statusCode, StatusCodes.OK);
  });

  await t.test('POST /api/lesc/holds/:id/transfer - users can only transfer their own holds', async () => {
    const { facility, lescServiceType } = await createTestData();

    const token1 = crypto.randomUUID();
    const token2 = crypto.randomUUID();

    const user1Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user1Id,
        transferToken: token1,
        transferTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const user2Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user2Id,
        transferToken: token2,
        transferTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // User 1 cannot transfer user 2's hold (even with valid token)
    const user1ForbiddenResponse = await app.inject().post(`/api/lesc/holds/${user2Hold.id}/transfer`).payload({
      token: token2,
    }).headers(user1Headers);
    assert.deepStrictEqual(user1ForbiddenResponse.statusCode, StatusCodes.FORBIDDEN);

    // User 2 can transfer their own hold
    const user2Response = await app.inject().post(`/api/lesc/holds/${user2Hold.id}/transfer`).payload({
      token: token2,
    }).headers(user2Headers);
    assert.deepStrictEqual(user2Response.statusCode, StatusCodes.OK);

    // User 1 can transfer their own hold
    const user1Response = await app.inject().post(`/api/lesc/holds/${user1Hold.id}/transfer`).payload({
      token: token1,
    }).headers(user1Headers);
    assert.deepStrictEqual(user1Response.statusCode, StatusCodes.OK);
  });

  await t.test('GET /api/lesc/holds/:id/transfer-status - users can only check status of their own holds', async () => {
    const { facility, lescServiceType } = await createTestData();

    const user1Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user1Id,
      },
    });

    const user2Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user2Id,
      },
    });

    // User 1 can check status of their own hold
    const user1Response = await app.inject().get(`/api/lesc/holds/${user1Hold.id}/transfer-status`).headers(user1Headers);
    assert.deepStrictEqual(user1Response.statusCode, StatusCodes.OK);

    // User 1 cannot check status of user 2's hold
    const user1ForbiddenResponse = await app.inject().get(`/api/lesc/holds/${user2Hold.id}/transfer-status`).headers(user1Headers);
    assert.deepStrictEqual(user1ForbiddenResponse.statusCode, StatusCodes.FORBIDDEN);

    // User 2 can check status of their own hold
    const user2Response = await app.inject().get(`/api/lesc/holds/${user2Hold.id}/transfer-status`).headers(user2Headers);
    assert.deepStrictEqual(user2Response.statusCode, StatusCodes.OK);

    // User 2 cannot check status of user 1's hold
    const user2ForbiddenResponse = await app.inject().get(`/api/lesc/holds/${user1Hold.id}/transfer-status`).headers(user2Headers);
    assert.deepStrictEqual(user2ForbiddenResponse.statusCode, StatusCodes.FORBIDDEN);
  });

  await t.test('POST /api/lesc/checkin/:holdId - any authenticated user can check in a client', async () => {
    const { facility, lescServiceType } = await createTestData();

    const user1Hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user1Id,
      },
    });

    // User 1 can check in a client for their own hold
    const user1Response = await app.inject().post(`/api/lesc/checkin/${user1Hold.id}`).payload({}).headers(user1Headers);
    assert.deepStrictEqual(user1Response.statusCode, StatusCodes.CREATED);

    // User 2 can also check in a client for user 1's hold (checkin is accessible to all users)
    const user2Response = await app.inject().post(`/api/lesc/checkin/${user1Hold.id}`).payload({}).headers(user2Headers);
    assert.deepStrictEqual(user2Response.statusCode, StatusCodes.CREATED);
  });
});
