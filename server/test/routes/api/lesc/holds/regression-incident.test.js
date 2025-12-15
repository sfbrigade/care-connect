import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import crypto from 'node:crypto';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/holds regression tests with incidents', async (t) => {
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
    // Create a facility
    const facility = await prisma.facility.create({
      data: {
        name: 'Test LESC Facility',
        isActive: true,
      },
    });

    // Create a LESC service type
    const lescServiceType = await prisma.serviceType.create({
      data: {
        code: 'LESC',
        name: 'LESC Service',
      },
    });

    // Create facility service with 10 available beds
    const facilityService = await prisma.facilityService.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: lescServiceType.id,
        availableBeds: 10,
        reservedBeds: 0,
      },
    });

    return { facility, lescServiceType, facilityService };
  }

  await t.test('extend hold still works', async (t) => {
    await t.test('extend hold with incident still works', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create an incident
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-EXTEND-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      // Create a hold linked to incident
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      const response = await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'EXTENDED');

      // Verify incident linkage is preserved
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
      });
      assert.deepStrictEqual(dbHold.incidentId, incident.id);
    });

    await t.test('extend hold without incident still works (backward compatibility)', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create a hold without incident
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          // incidentId is null
        },
      });

      const response = await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'EXTENDED');

      // Verify incidentId is still null
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
      });
      assert.deepStrictEqual(dbHold.incidentId, null);
    });
  });

  await t.test('cancel hold still works', async (t) => {
    await t.test('cancel hold with incident still works', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create an incident
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-CANCEL-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      // Create a hold linked to incident
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      const response = await app.inject().delete(`/api/lesc/holds/${hold.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'CANCELLED');

      // Verify incident linkage is preserved
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
      });
      assert.deepStrictEqual(dbHold.incidentId, incident.id);
      assert.deepStrictEqual(dbHold.status, 'CANCELLED');
    });

    await t.test('cancel hold without incident still works (backward compatibility)', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create a hold without incident
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      const response = await app.inject().delete(`/api/lesc/holds/${hold.id}`).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'CANCELLED');

      // Verify incidentId is still null
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
      });
      assert.deepStrictEqual(dbHold.incidentId, null);
    });
  });

  await t.test('transfer hold still works', async (t) => {
    await t.test('transfer hold with incident still works', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create an incident
      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-TRANSFER-TEST',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      // Create a hold linked to incident
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      // First generate a QR token for the hold
      const qrResponse = await app.inject().get(`/api/lesc/holds/${hold.id}/qr`).headers(userHeaders);
      assert.deepStrictEqual(qrResponse.statusCode, StatusCodes.OK);
      const qrData = JSON.parse(qrResponse.body);
      const token = qrData.token;

      // Then transfer using the token
      const response = await app.inject().post(`/api/lesc/holds/${hold.id}/transfer`).payload({
        token,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'TRANSFERRED');

      // Verify incident linkage is preserved
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
      });
      assert.deepStrictEqual(dbHold.incidentId, incident.id);
      assert.deepStrictEqual(dbHold.status, 'TRANSFERRED');
    });

    await t.test('transfer hold without incident still works (backward compatibility)', async () => {
      const { facility, lescServiceType } = await createTestData();

      // Create a hold without incident
      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      // First generate a QR token for the hold
      const qrResponse = await app.inject().get(`/api/lesc/holds/${hold.id}/qr`).headers(userHeaders);
      assert.deepStrictEqual(qrResponse.statusCode, StatusCodes.OK);
      const qrData = JSON.parse(qrResponse.body);
      const token = qrData.token;

      // Then transfer using the token
      const response = await app.inject().post(`/api/lesc/holds/${hold.id}/transfer`).payload({
        token,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'TRANSFERRED');

      // Verify incidentId is still null
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
      });
      assert.deepStrictEqual(dbHold.incidentId, null);
    });
  });

  await t.test('hold operations don\'t affect incident linkage', async (t) => {
    await t.test('extend preserves incident linkage', async () => {
      const { facility, lescServiceType } = await createTestData();

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-PRESERVE-EXTEND',
          dateTimeArrested: new Date(),
          createdById: userId,
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
          incidentId: incident.id,
        },
      });

      // Extend the hold
      await app.inject().patch(`/api/lesc/holds/${hold.id}/extend`).headers(userHeaders);

      // Verify incident still linked
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
        include: { incident: true },
      });
      assert.deepStrictEqual(dbHold.incidentId, incident.id);
      assert.ok(dbHold.incident);
      assert.deepStrictEqual(dbHold.incident.id, incident.id);
    });

    await t.test('cancel preserves incident linkage', async () => {
      const { facility, lescServiceType } = await createTestData();

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-PRESERVE-CANCEL',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      // Cancel the hold
      await app.inject().delete(`/api/lesc/holds/${hold.id}`).headers(userHeaders);

      // Verify incident still linked
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
        include: { incident: true },
      });
      assert.deepStrictEqual(dbHold.incidentId, incident.id);
      assert.ok(dbHold.incident);
      assert.deepStrictEqual(dbHold.incident.id, incident.id);
    });

    await t.test('transfer preserves incident linkage', async () => {
      const { facility, lescServiceType } = await createTestData();

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-PRESERVE-TRANSFER',
          dateTimeArrested: new Date(),
          createdById: userId,
        },
      });

      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: lescServiceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: userId,
          incidentId: incident.id,
        },
      });

      const token = crypto.randomBytes(32).toString('hex');
      // Transfer the hold
      await app.inject().post(`/api/lesc/holds/${hold.id}/transfer`).payload({
        transferToken: token,
        transferTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }).headers(userHeaders);

      // Verify incident still linked
      const dbHold = await prisma.bedHold.findUnique({
        where: { id: hold.id },
        include: { incident: true },
      });
      assert.deepStrictEqual(dbHold.incidentId, incident.id);
      assert.ok(dbHold.incident);
      assert.deepStrictEqual(dbHold.incident.id, incident.id);
    });
  });
});
