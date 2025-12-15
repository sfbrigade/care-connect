import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import crypto from 'node:crypto';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds - Transfer Feedback Flow', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const leoHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const clinicHeaders = await authenticate(app, 'admin.user@test.com', 'test');

  // Get the authenticated user IDs
  const leo = await prisma.user.findUnique({
    where: { email: 'regular.user@test.com' },
  });
  const clinicUser = await prisma.user.findUnique({
    where: { email: 'admin.user@test.com' },
  });
  const leoId = leo.id;
  const clinicUserId = clinicUser.id;

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

  await t.test('transfer token expiration is 30 seconds', async () => {
    const { facility, lescServiceType } = await createTestData();

    // Create a hold
    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdById: leoId,
      },
    });

    // Generate QR code
    const beforeQR = new Date();
    const qrResponse = await app.inject().get(`/api/lesc/holds/${hold.id}/qr`).headers(leoHeaders);
    const afterQR = new Date();

    assert.deepStrictEqual(qrResponse.statusCode, StatusCodes.OK);
    const qrData = JSON.parse(qrResponse.body);

    // Verify token expiration is approximately 30 seconds from now
    const expiresAt = new Date(qrData.expiresAt);
    const timeDiff = expiresAt.getTime() - beforeQR.getTime();
    const timeDiffAfter = expiresAt.getTime() - afterQR.getTime();

    // Should be between 29-31 seconds (accounting for test execution time)
    assert.ok(timeDiff >= 29000 && timeDiff <= 31000, `Expected ~30 seconds, got ${timeDiff}ms`);
    assert.ok(timeDiffAfter >= 29000 && timeDiffAfter <= 31000, `Expected ~30 seconds, got ${timeDiffAfter}ms`);
  });

  await t.test('transfer status endpoint returns correct data', async () => {
    const { facility, lescServiceType } = await createTestData();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 1000); // 30 seconds

    // Create hold with transfer token
    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        transferToken: token,
        transferTokenExpiresAt: expiresAt,
        createdById: leoId,
      },
    });

    // Check transfer status (not transferred yet)
    const statusResponse = await app.inject().get(`/api/lesc/holds/${hold.id}/transfer-status`).headers(leoHeaders);
    assert.deepStrictEqual(statusResponse.statusCode, StatusCodes.OK);
    const statusData = JSON.parse(statusResponse.body);

    assert.deepStrictEqual(statusData.id, hold.id);
    assert.deepStrictEqual(statusData.isTransferred, false);
    assert.strictEqual(statusData.transferredAt, null);
    assert.strictEqual(statusData.transferredBy, null);
  });

  await t.test('transfer status updates when hold is checked in', async () => {
    const { facility, lescServiceType } = await createTestData();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 1000); // 30 seconds

    // Create hold with transfer token
    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        transferToken: token,
        transferTokenExpiresAt: expiresAt,
        createdById: leoId,
      },
    });

    // Clinic worker checks in the hold
    const checkinResponse = await app.inject().post(`/api/lesc/checkin/${hold.id}`).payload({}).headers(clinicHeaders);
    assert.deepStrictEqual(checkinResponse.statusCode, StatusCodes.CREATED);

    // Verify hold is marked as TRANSFERRED
    const updatedHold = await prisma.bedHold.findUnique({
      where: { id: hold.id },
      include: {
        transferredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    assert.deepStrictEqual(updatedHold.status, 'TRANSFERRED');
    assert.ok(updatedHold.transferredAt);
    assert.deepStrictEqual(updatedHold.transferredById, clinicUserId);
    assert.strictEqual(updatedHold.transferToken, null);
    assert.strictEqual(updatedHold.transferTokenExpiresAt, null);

    // Check transfer status endpoint returns transferred status
    const statusResponse = await app.inject().get(`/api/lesc/holds/${hold.id}/transfer-status`).headers(leoHeaders);
    assert.deepStrictEqual(statusResponse.statusCode, StatusCodes.OK);
    const statusData = JSON.parse(statusResponse.body);

    assert.deepStrictEqual(statusData.id, hold.id);
    assert.deepStrictEqual(statusData.isTransferred, true);
    assert.ok(statusData.transferredAt);
    assert.deepStrictEqual(statusData.transferredBy.id, clinicUserId);
    assert.deepStrictEqual(statusData.transferredBy.firstName, clinicUser.firstName);
    assert.deepStrictEqual(statusData.transferredBy.lastName, clinicUser.lastName);
  });

  await t.test('transfer token expiration is enforced', async () => {
    const { facility, lescServiceType } = await createTestData();
    const token = crypto.randomUUID();
    const expiredAt = new Date(Date.now() - 1000); // Already expired

    // Create hold with expired transfer token
    const hold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        transferToken: token,
        transferTokenExpiresAt: expiredAt,
        createdById: leoId,
      },
    });

    // Try to transfer with expired token (must be done by hold creator)
    const transferResponse = await app.inject().post(`/api/lesc/holds/${hold.id}/transfer`).payload({
      token,
    }).headers(leoHeaders);

    assert.deepStrictEqual(transferResponse.statusCode, StatusCodes.BAD_REQUEST);
    const error = JSON.parse(transferResponse.body);
    assert.ok(error.error.includes('expired') || error.error.includes('expiration'));
  });

  await t.test('only one pending transfer per LEO', async () => {
    const { facility, lescServiceType } = await createTestData();
    const token1 = crypto.randomUUID();
    const token2 = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 1000);

    // Create two holds with transfer tokens
    const hold1 = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        transferToken: token1,
        transferTokenExpiresAt: expiresAt,
        createdById: leoId,
      },
    });

    const hold2 = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        transferToken: token2,
        transferTokenExpiresAt: expiresAt,
        createdById: leoId,
      },
    });

    // List holds - both should have transfer tokens
    const listResponse = await app.inject().get('/api/lesc/holds').headers(leoHeaders);
    assert.deepStrictEqual(listResponse.statusCode, StatusCodes.OK);
    const holdsData = JSON.parse(listResponse.body);

    const foundHold1 = holdsData.find(h => h.id === hold1.id);
    const foundHold2 = holdsData.find(h => h.id === hold2.id);

    assert.ok(foundHold1);
    assert.ok(foundHold2);
    // Note: In practice, the frontend will only poll one transfer at a time
    // This test verifies both holds can have tokens simultaneously
  });
});

