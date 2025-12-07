import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds - Regression: QR Endpoint', async (t) => {
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

  await t.test('verify existing hold endpoints still work', async (t) => {
    await t.test('hold list still returns correct data', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      const response = await app.inject().get('/api/lesc/holds').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      const foundHold = data.find(h => h.id === hold.id);
      assert.ok(foundHold);
      assert.deepStrictEqual(foundHold.status, 'ACTIVE');
    });

    await t.test('hold creation still works', async () => {
      const { facility, lescServiceType } = await createTestData();
      const response = await app.inject().post('/api/lesc/holds').payload({
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        bedsRequested: 1,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
    });

    await t.test('hold extension still works', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      const response = await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'EXTENDED');
    });

    await t.test('hold cancellation still works', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      const response = await app.inject().delete(`/api/lesc/holds/${hold.id}`).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'CANCELLED');
    });
  });

  await t.test('verify QR endpoint doesn\'t interfere with existing operations', async (t) => {
    await t.test('hold can be extended after QR token is generated', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      // Generate QR token
      const qrResponse = await app.inject().get(`/api/lesc/holds/${hold.id}/qr`).headers(userHeaders);
      assert.deepStrictEqual(qrResponse.statusCode, StatusCodes.OK);

      // Should still be able to extend
      const extendResponse = await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);
      assert.deepStrictEqual(extendResponse.statusCode, StatusCodes.OK);
    });

    await t.test('hold can be cancelled after QR token is generated', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      // Generate QR token
      const qrResponse = await app.inject().get(`/api/lesc/holds/${hold.id}/qr`).headers(userHeaders);
      assert.deepStrictEqual(qrResponse.statusCode, StatusCodes.OK);

      // Should still be able to cancel
      const cancelResponse = await app.inject().delete(`/api/lesc/holds/${hold.id}`).headers(userHeaders);
      assert.deepStrictEqual(cancelResponse.statusCode, StatusCodes.OK);
    });
  });
});
