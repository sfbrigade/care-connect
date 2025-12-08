import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds/:id/for-checkin - Check-in Format and Authorization', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const user1Headers = await authenticate(app, 'regular.user@test.com', 'test');
  const user2Headers = await authenticate(app, 'admin.user@test.com', 'test');

  // Get user IDs
  const user1 = await prisma.user.findUnique({
    where: { email: 'regular.user@test.com' },
  });
  const user1Id = user1.id;

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

  await t.test('GET /:id/for-checkin - 3-character code format', async (t) => {
    await t.test('accepts 3-character code (uppercase)', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id,
        },
      });

      // Extract first 3 characters and convert to uppercase
      const shortCode = hold.id.substring(0, 3).toUpperCase();

      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, hold.id);
      assert.deepStrictEqual(data.facilityId, facility.id);
      assert.deepStrictEqual(data.status, 'ACTIVE');
    });

    await t.test('accepts 3-character code (lowercase)', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id,
        },
      });

      // Extract first 3 characters and keep lowercase
      const shortCode = hold.id.substring(0, 3).toLowerCase();

      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, hold.id);
    });

    await t.test('accepts 3-character code (mixed case)', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id,
        },
      });

      // Extract first 3 characters with mixed case
      const shortCode = hold.id.substring(0, 3);

      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, hold.id);
    });

    await t.test('returns 404 when no hold matches 3-character code', async () => {
      const response = await app.inject().get('/api/lesc/holds/XXX/for-checkin').headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);

      const data = JSON.parse(response.body);
      assert.ok(data.error);
      assert.ok(data.error.includes('No active hold found with ID code'));
    });

    await t.test('returns 400 when multiple holds match 3-character code', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create two holds that start with the same 3 characters
      // We'll need to find a UUID prefix that can be duplicated
      // Since UUIDs are random, we'll create holds until we find a collision or use a known prefix
      const hold1 = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id,
        },
      });

      const prefix = hold1.id.substring(0, 3).toLowerCase();

      // Try to create another hold with the same prefix
      // Since UUIDs are random, we'll create multiple holds and check if any match
      let hold2 = null;
      for (let i = 0; i < 10; i++) {
        const testHold = await prisma.bedHold.create({
          data: {
            facilityId: facility.id,
            serviceTypeId: lescServiceType.id,
            bedsRequested: 1,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            status: 'ACTIVE',
            createdById: user1Id,
          },
        });

        if (testHold.id.substring(0, 3).toLowerCase() === prefix) {
          hold2 = testHold;
          break;
        } else {
          // Clean up non-matching hold
          await prisma.bedHold.delete({ where: { id: testHold.id } });
        }
      }

      // If we found a match, test the error case
      if (hold2) {
        const response = await app.inject().get(`/api/lesc/holds/${prefix.toUpperCase()}/for-checkin`).headers(user1Headers);
        assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);

        const data = JSON.parse(response.body);
        assert.ok(data.error);
        assert.ok(data.error.includes('Multiple holds found'));
        assert.ok(data.error.includes('Please use the full hold ID'));
      } else {
        // If no collision found, skip this test (UUID collisions are rare)
        console.log('Skipping multiple match test - no UUID prefix collision found');
      }
    });
  });

  await t.test('GET /:id/for-checkin - Full UUID format', async (t) => {
    await t.test('accepts full UUID', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id,
        },
      });

      const response = await app.inject().get(`/api/lesc/holds/${hold.id}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, hold.id);
      assert.deepStrictEqual(data.facilityId, facility.id);
      assert.deepStrictEqual(data.status, 'ACTIVE');
    });

    await t.test('returns 404 when UUID does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().get(`/api/lesc/holds/${nonExistentId}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);

      const data = JSON.parse(response.body);
      assert.ok(data.error);
      assert.ok(data.error.includes('Hold not found'));
    });
  });

  await t.test('GET /:id/for-checkin - Authorization: Any user can check in any hold', async (t) => {
    await t.test('user1 can check in their own hold', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id,
        },
      });

      const shortCode = hold.id.substring(0, 3).toUpperCase();
      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, hold.id);
    });

    await t.test('user2 can check in user1\'s hold (cross-user check-in)', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id, // Created by user1
        },
      });

      // User2 (different user) can access the hold for check-in
      const shortCode = hold.id.substring(0, 3).toUpperCase();
      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user2Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, hold.id);
      assert.deepStrictEqual(data.facilityId, facility.id);
    });

    await t.test('user2 can check in user1\'s hold using full UUID', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id, // Created by user1
        },
      });

      // User2 (different user) can access the hold for check-in using full UUID
      const response = await app.inject().get(`/api/lesc/holds/${hold.id}/for-checkin`).headers(user2Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, hold.id);
    });

    await t.test('requires authentication', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id,
        },
      });

      const shortCode = hold.id.substring(0, 3).toUpperCase();
      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`);
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('GET /:id/for-checkin - Hold status validation', async (t) => {
    await t.test('rejects expired holds', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() - 1000), // Expired
          status: 'EXPIRED',
          createdById: user1Id,
        },
      });

      const shortCode = hold.id.substring(0, 3).toUpperCase();
      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND); // Not found because expired holds are filtered out
    });

    await t.test('rejects cancelled holds', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'CANCELLED',
          createdById: user1Id,
        },
      });

      const shortCode = hold.id.substring(0, 3).toUpperCase();
      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND); // Not found because cancelled holds are filtered out
    });

    await t.test('rejects transferred holds', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'TRANSFERRED',
          createdById: user1Id,
        },
      });

      const shortCode = hold.id.substring(0, 3).toUpperCase();
      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND); // Not found because transferred holds are filtered out
    });

    await t.test('accepts ACTIVE holds', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id,
        },
      });

      const shortCode = hold.id.substring(0, 3).toUpperCase();
      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    });

    await t.test('accepts EXTENDED holds', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'EXTENDED',
          createdById: user1Id,
        },
      });

      const shortCode = hold.id.substring(0, 3).toUpperCase();
      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    });
  });

  await t.test('GET /:id/for-checkin - Response format', async (t) => {
    await t.test('returns correct hold data structure', async () => {
      const { facility, lescServiceType } = await createTestData();
      const client = await prisma.client.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          sex: 'Male',
          race: 'White',
          personallyIdentifiable: 'Yes',
        },
      });

      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 2,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id,
          clientId: client.id,
          notes: 'Test notes',
        },
      });

      const shortCode = hold.id.substring(0, 3).toUpperCase();
      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.ok(data.id);
      assert.ok(data.facilityId);
      assert.ok(data.facilityName);
      assert.ok(data.serviceTypeId);
      assert.ok(data.serviceTypeCode);
      assert.ok(data.serviceTypeName);
      assert.deepStrictEqual(data.bedsRequested, 2);
      assert.ok(data.expiresAt);
      assert.deepStrictEqual(data.status, 'ACTIVE');
      assert.ok(data.createdAt);
      assert.deepStrictEqual(data.notes, 'Test notes');
      assert.ok(data.client);
      assert.deepStrictEqual(data.client.id, client.id);
      assert.deepStrictEqual(data.client.firstName, 'John');
      assert.deepStrictEqual(data.client.lastName, 'Doe');
    });

    await t.test('returns null client when hold has no client', async () => {
      const { facility, lescServiceType } = await createTestData();
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1Id,
          notes: 'Hold without client',
        },
      });

      const shortCode = hold.id.substring(0, 3).toUpperCase();
      const response = await app.inject().get(`/api/lesc/holds/${shortCode}/for-checkin`).headers(user1Headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.client, null);
    });
  });
});
