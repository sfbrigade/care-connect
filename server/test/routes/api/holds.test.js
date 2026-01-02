import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/holds', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('POST /', async (t) => {
    await t.test('creates a hold successfully', async () => {
      const response = await app.inject().post('/api/holds').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        serviceTypeId: '0c752837-76b8-437f-b279-512e1c848634',
        notes: 'Test hold notes',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      let hold = JSON.parse(response.body);
      assert.ok(hold.id);
      assert.deepStrictEqual(hold.facilityId, '6d123d8f-edd5-4d14-9220-0508eb30b47b');
      assert.deepStrictEqual(hold.serviceTypeId, '0c752837-76b8-437f-b279-512e1c848634');
      assert.deepStrictEqual(hold.status, 'ACTIVE');
      assert.ok(hold.expiresAt);
      assert.ok(hold.createdAt);

      // Verify expiration is approximately 60 minutes from now
      const expiresAt = new Date(hold.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
      assert.ok(diffMinutes >= 59 && diffMinutes <= 61, `Expected ~60 minutes, got ${diffMinutes}`);

      // Verify hold was created in database
      hold = await prisma.bedHold.findUnique({
        where: {
          id: hold.id,
        },
      });
      assert.deepStrictEqual(hold.bedsRequested, 1);
    });

    await t.test('returns error when facility not found', async () => {
      const response = await app.inject().post('/api/holds').payload({
        facilityId: '00000000-0000-0000-0000-000000000000',
        serviceTypeId: '0c752837-76b8-437f-b279-512e1c848634',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Facility not found');
    });

    await t.test('returns error when insufficient beds available', async () => {
      const response = await app.inject().post('/api/holds').payload({
        facilityId: 'fab67d53-a1c7-4eb5-b151-33727270ad20',
        serviceTypeId: '0c752837-76b8-437f-b279-512e1c848634',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Insufficient beds available');
    });
  });

  await t.test('GET /', async (t) => {
    await t.test('returns list of active/extended holds', async () => {
      const response = await app.inject().get('/api/holds').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const holds = JSON.parse(response.body);
      assert.deepStrictEqual(holds.length, 2);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns hold by id', async () => {
      const response = await app.inject().get('/api/holds/b65ae02b-9b35-43e2-897b-eee6eb5a82e2').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const hold = JSON.parse(response.body);
      assert.deepStrictEqual(hold.facilityId, '6d123d8f-edd5-4d14-9220-0508eb30b47b');
      assert.deepStrictEqual(hold.serviceTypeId, '0c752837-76b8-437f-b279-512e1c848634');
      assert.deepStrictEqual(hold.status, 'ACTIVE');
      assert.deepStrictEqual(hold.createdById, 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5');
      assert.deepStrictEqual(hold.cancelledById, null);
      assert.deepStrictEqual(hold.cancelledAt, null);
      assert.deepStrictEqual(hold.transferToken, null);
      assert.deepStrictEqual(hold.transferTokenExpiresAt, null);
      assert.deepStrictEqual(hold.transferredById, null);
      assert.deepStrictEqual(hold.transferredAt, null);
      assert.deepStrictEqual(hold.incidentId, '2fa77128-586c-465a-9381-c441e633e3b2');
      assert.deepStrictEqual(hold.notes, null);
      assert.deepStrictEqual(hold.clientId, 'a95b66ee-f5f3-4e59-87d8-b56afdfd7ab5');
    });

    await t.test('returns hold with specified included objects', async () => {
      const response = await app.inject().get('/api/holds/b65ae02b-9b35-43e2-897b-eee6eb5a82e2?include=facility,serviceType,client,incident,createdBy,cancelledBy,transferredBy').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const hold = JSON.parse(response.body);

      assert.ok(hold.client);
      assert.ok(hold.facility);
      assert.ok(hold.serviceType);
      assert.ok(hold.incident);
      assert.ok(hold.createdBy);
    });
  });

  await t.test('GET /:id/qr', async (t) => {
    await t.test('returns QR code for hold', async () => {
      const response = await app.inject().get('/api/holds/b65ae02b-9b35-43e2-897b-eee6eb5a82e2/qr').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(data);
      assert.ok(data.qrUrl);
      assert.ok(data.token);
      assert.ok(data.expiresAt);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates a hold successfully', async () => {
      const response = await app.inject().patch('/api/holds/b65ae02b-9b35-43e2-897b-eee6eb5a82e2')
        .payload({
          incidentId: '921a02ad-af5f-404f-84f2-b8c987d436d8',
          notes: 'Updated notes',
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      let hold = JSON.parse(response.body);
      assert.deepStrictEqual(hold.incidentId, '921a02ad-af5f-404f-84f2-b8c987d436d8');
      assert.deepStrictEqual(hold.notes, 'Updated notes');

      // Verify hold was updated in database
      hold = await prisma.bedHold.findUnique({
        where: { id: 'b65ae02b-9b35-43e2-897b-eee6eb5a82e2' },
      });
      assert.deepStrictEqual(hold.incidentId, '921a02ad-af5f-404f-84f2-b8c987d436d8');
      assert.deepStrictEqual(hold.notes, 'Updated notes');
    });
  });

  await t.test('PATCH /:id/extend', async (t) => {
    await t.test('extends a hold successfully', async () => {
      // Create a hold
      let hold = await prisma.bedHold.findUnique({
        where: { id: 'b65ae02b-9b35-43e2-897b-eee6eb5a82e2' },
      });

      const originalExpiresAt = hold.expiresAt;

      const response = await app.inject().patch('/api/holds/extend')
        .payload({
          ids: ['b65ae02b-9b35-43e2-897b-eee6eb5a82e2']
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify expiration was extended by 30 minutes
      hold = await prisma.bedHold.findUnique({
        where: { id: 'b65ae02b-9b35-43e2-897b-eee6eb5a82e2' },
      });
      const newExpiresAt = new Date(hold.expiresAt);
      const diffMinutes = (newExpiresAt.getTime() - originalExpiresAt.getTime()) / (1000 * 60);
      assert.deepStrictEqual(diffMinutes, 30);
    });

    await t.test('can extend an already extended hold', async () => {
      // Get the hold after first extension
      const afterFirstExtend = await prisma.bedHold.findUnique({
        where: { id: '7a261ab8-a6b6-427a-a67e-2509332a7bdd' },
      });

      // Extend again
      const response = await app.inject().patch('/api/holds/extend')
        .payload({
          ids: ['7a261ab8-a6b6-427a-a67e-2509332a7bdd']
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify it was extended by another 30 minutes
      const afterSecondExtend = await prisma.bedHold.findUnique({
        where: { id: '7a261ab8-a6b6-427a-a67e-2509332a7bdd' },
      });
      const newExpiresAt = new Date(afterSecondExtend.expiresAt);
      const diffMinutes = (newExpiresAt.getTime() - afterFirstExtend.expiresAt.getTime()) / (1000 * 60);
      assert.deepStrictEqual(diffMinutes, 30);
    });

    await t.test('returns error when hold not found', async () => {
      const fakeHoldId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().patch('/api/holds/extend')
        .payload({
          ids: [fakeHoldId]
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('returns error when hold cannot be extended (cancelled)', async () => {
      const response = await app.inject().patch('/api/holds/extend')
        .payload({
          ids: ['f2d6f235-5aeb-457e-8d42-b0cc096920c0']
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Holds cannot be extended');
    });

    await t.test('returns error when hold has already expired', async () => {
      const response = await app.inject().patch('/api/holds/extend')
        .payload({
          ids: ['00d1daba-df84-4fda-86f3-eb5a2939528b']
        })
        .headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Holds have already expired');
    });
  });

  await t.test('DELETE /:id', async (t) => {
    await t.test('cancels a hold successfully', async () => {
      const response = await app.inject().delete('/api/holds/b65ae02b-9b35-43e2-897b-eee6eb5a82e2')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify in database
      const cancelledHold = await prisma.bedHold.findUnique({
        where: { id: 'b65ae02b-9b35-43e2-897b-eee6eb5a82e2' },
      });
      assert.deepStrictEqual(cancelledHold.status, 'CANCELLED');
      assert.ok(cancelledHold.cancelledAt);
    });

    await t.test('returns error when hold not found', async () => {
      const fakeHoldId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().delete(`/api/holds/${fakeHoldId}`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Hold not found');
    });

    await t.test('returns error when hold is already cancelled', async () => {
      const response = await app.inject().delete('/api/holds/f2d6f235-5aeb-457e-8d42-b0cc096920c0')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.error, 'Hold is already cancelled');
    });
  });
});
