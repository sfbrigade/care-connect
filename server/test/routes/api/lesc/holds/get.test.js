import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds/:id - Get Hold by ID', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Get the authenticated user ID
  const user = await prisma.user.findUnique({
    where: { email: 'regular.user@test.com' },
  });
  const userId = user.id;

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

  await t.test('GET /:id returns hold with new client fields', async () => {
    const { facility, lescServiceType } = await createTestData();

    // Set up: Create client with all new fields
    const client = await prisma.client.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        middleInitial: 'M',
        address: '123 Main St, San Francisco, CA 94102',
        driverLicense: 'DL123456',
        localId: 'SF-789',
      },
    });

    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: userId,
        clientId: client.id,
      },
    });

    // Test: Get hold by ID
    const response = await app.inject().get(`/api/lesc/holds/${hold.id}`).headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const data = JSON.parse(response.body);
    assert.ok(data.client);
    assert.deepStrictEqual(data.client.middleInitial, 'M');
    assert.deepStrictEqual(data.client.address, '123 Main St, San Francisco, CA 94102');
    assert.deepStrictEqual(data.client.driverLicense, 'DL123456');
    assert.deepStrictEqual(data.client.localId, 'SF-789');
  });

  await t.test('GET /:id returns null for client fields when not set', async () => {
    const { facility, lescServiceType } = await createTestData();

    // Set up: Create client without new fields
    const client = await prisma.client.create({
      data: {
        firstName: 'Jane',
        lastName: 'Smith',
        // No middleInitial, address, driverLicense, localId
      },
    });

    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: userId,
        clientId: client.id,
      },
    });

    // Test: Get hold by ID
    const response = await app.inject().get(`/api/lesc/holds/${hold.id}`).headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const data = JSON.parse(response.body);
    assert.ok(data.client);
    assert.deepStrictEqual(data.client.middleInitial, null);
    assert.deepStrictEqual(data.client.address, null);
    assert.deepStrictEqual(data.client.driverLicense, null);
    assert.deepStrictEqual(data.client.localId, null);
  });

  await t.test('GET /:id returns 404 for non-existent hold', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const response = await app.inject().get(`/api/lesc/holds/${nonExistentId}`).headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
  });

  await t.test('GET /:id returns 403 for hold created by another user', async () => {
    const { facility, lescServiceType } = await createTestData();

    // Get another user
    const otherUser = await prisma.user.findUnique({
      where: { email: 'admin.user@test.com' },
    });

    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: otherUser.id, // Created by different user
      },
    });

    // Test: Try to get hold created by another user
    const response = await app.inject().get(`/api/lesc/holds/${hold.id}`).headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
  });

  await t.test('GET /:id validates schema with new client fields', async () => {
    const { facility, lescServiceType } = await createTestData();

    const client = await prisma.client.create({
      data: {
        firstName: 'Test',
        lastName: 'Client',
        middleInitial: 'T',
        address: 'Test Address',
        driverLicense: 'DL999',
        localId: 'SF-123',
      },
    });

    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: userId,
        clientId: client.id,
      },
    });

    const response = await app.inject().get(`/api/lesc/holds/${hold.id}`).headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

    const data = JSON.parse(response.body);
    // Verify schema includes new fields
    assert.ok('middleInitial' in data.client);
    assert.ok('address' in data.client);
    assert.ok('driverLicense' in data.client);
    assert.ok('localId' in data.client);
  });
});
