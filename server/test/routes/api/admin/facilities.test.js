import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/admin/facilities', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

  await t.test('GET /', async (t) => {
    await t.test('returns list of all facilities', async () => {
      const facility1 = await prisma.facility.create({
        data: {
          name: 'Test Facility 1',
          isActive: true,
        },
      });

      const facility2 = await prisma.facility.create({
        data: {
          name: 'Test Facility 2',
          isActive: false,
        },
      });

      const response = await app.inject().get('/api/admin/facilities').headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.ok(Array.isArray(data));
      const facilityIds = data.map(f => f.id);
      assert.ok(facilityIds.includes(facility1.id));
      assert.ok(facilityIds.includes(facility2.id));
    });

    await t.test('returns facilities ordered by name', async () => {
      await prisma.facility.create({
        data: {
          name: 'Zebra Facility',
          isActive: true,
        },
      });

      await prisma.facility.create({
        data: {
          name: 'Alpha Facility',
          isActive: true,
        },
      });

      const response = await app.inject().get('/api/admin/facilities').headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      // Find our facilities
      const alphaIndex = data.findIndex(f => f.name === 'Alpha Facility');
      const zebraIndex = data.findIndex(f => f.name === 'Zebra Facility');

      assert.ok(alphaIndex >= 0);
      assert.ok(zebraIndex >= 0);
      assert.ok(alphaIndex < zebraIndex, 'Alpha should come before Zebra');
    });

    await t.test('includes all facility fields', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Complete Facility',
          description: 'Test Description',
          phone: '555-1234',
          email: 'test@example.com',
          website: 'https://example.com',
          addressLine1: '123 Main St',
          addressLine2: 'Suite 100',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          neighborhood: 'Downtown',
          latitude: 37.7749,
          longitude: -122.4194,
          isActive: true,
        },
      });

      const response = await app.inject().get('/api/admin/facilities').headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      const foundFacility = data.find(f => f.id === facility.id);
      assert.ok(foundFacility);
      assert.deepStrictEqual(foundFacility.name, 'Complete Facility');
      assert.deepStrictEqual(foundFacility.description, 'Test Description');
      assert.deepStrictEqual(foundFacility.phone, '555-1234');
      assert.deepStrictEqual(foundFacility.email, 'test@example.com');
      assert.deepStrictEqual(foundFacility.website, 'https://example.com');
      assert.deepStrictEqual(foundFacility.addressLine1, '123 Main St');
      assert.deepStrictEqual(foundFacility.addressLine2, 'Suite 100');
      assert.deepStrictEqual(foundFacility.city, 'San Francisco');
      assert.deepStrictEqual(foundFacility.state, 'CA');
      assert.deepStrictEqual(foundFacility.postalCode, '94102');
      assert.deepStrictEqual(foundFacility.neighborhood, 'Downtown');
      assert.deepStrictEqual(foundFacility.latitude, 37.7749);
      assert.deepStrictEqual(foundFacility.longitude, -122.4194);
      assert.deepStrictEqual(foundFacility.isActive, true);
      assert.ok(foundFacility.createdAt);
      assert.ok(foundFacility.updatedAt);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().get('/api/admin/facilities');

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns facility details with services and contacts', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Detailed Facility',
          isActive: true,
        },
      });

      const serviceType = await prisma.serviceType.create({
        data: {
          code: 'LESC',
          name: 'LESC Service',
        },
      });

      await prisma.facilityService.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: serviceType.id,
          availableBeds: 10,
          reservedBeds: 2,
        },
      });

      const contact = await prisma.facilityContact.create({
        data: {
          facilityId: facility.id,
          name: 'John Doe',
          role: 'Manager',
          email: 'john@example.com',
          phone: '555-5678',
          isPrimary: true,
        },
      });

      const response = await app.inject().get(`/api/admin/facilities/${facility.id}`).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.id, facility.id);
      assert.deepStrictEqual(data.name, 'Detailed Facility');
      assert.ok(Array.isArray(data.services));
      assert.deepStrictEqual(data.services.length, 1);
      assert.deepStrictEqual(data.services[0].serviceTypeCode, 'LESC');
      assert.deepStrictEqual(data.services[0].availableBeds, 10);
      assert.deepStrictEqual(data.services[0].reservedBeds, 2);
      assert.ok(Array.isArray(data.contacts));
      assert.deepStrictEqual(data.contacts.length, 1);
      assert.deepStrictEqual(data.contacts[0].id, contact.id);
      assert.deepStrictEqual(data.contacts[0].name, 'John Doe');
    });

    await t.test('returns 404 for non-existent facility', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().get(`/api/admin/facilities/${nonExistentId}`).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('requires authentication', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Test Facility',
          isActive: true,
        },
      });

      const response = await app.inject().get(`/api/admin/facilities/${facility.id}`);

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('POST /', async (t) => {
    await t.test('creates a new facility', async () => {
      const response = await app.inject().post('/api/admin/facilities').payload({
        name: 'New Facility',
        description: 'Test Description',
        phone: '555-9999',
        isActive: true,
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);

      assert.ok(data.id);
      assert.deepStrictEqual(data.name, 'New Facility');

      // Verify in database
      const facility = await prisma.facility.findUnique({
        where: { id: data.id },
      });
      assert.ok(facility);
      assert.deepStrictEqual(facility.name, 'New Facility');
      assert.deepStrictEqual(facility.description, 'Test Description');
      assert.deepStrictEqual(facility.phone, '555-9999');
      assert.deepStrictEqual(facility.isActive, true);
    });

    await t.test('creates facility with all fields', async () => {
      const response = await app.inject().post('/api/admin/facilities').payload({
        name: 'Complete New Facility',
        description: 'Full Description',
        phone: '555-1111',
        email: 'new@example.com',
        website: 'https://new.example.com',
        addressLine1: '456 New St',
        addressLine2: 'Apt 200',
        city: 'Oakland',
        state: 'CA',
        postalCode: '94601',
        neighborhood: 'Uptown',
        latitude: 37.8044,
        longitude: -122.2711,
        isActive: false,
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);

      const facility = await prisma.facility.findUnique({
        where: { id: data.id },
      });
      assert.deepStrictEqual(facility.name, 'Complete New Facility');
      assert.deepStrictEqual(facility.email, 'new@example.com');
      // Prisma returns Decimal types for latitude/longitude, convert to number for comparison
      assert.deepStrictEqual(facility.latitude != null ? Number(facility.latitude) : null, 37.8044);
      assert.deepStrictEqual(facility.longitude != null ? Number(facility.longitude) : null, -122.2711);
      assert.deepStrictEqual(facility.isActive, false);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().post('/api/admin/facilities').payload({
        name: 'Unauthorized Facility',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates facility fields', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Original Name',
          description: 'Original Description',
          isActive: true,
        },
      });

      const response = await app.inject().patch(`/api/admin/facilities/${facility.id}`).payload({
        name: 'Updated Name',
        description: 'Updated Description',
        isActive: false,
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.id, facility.id);
      assert.deepStrictEqual(data.name, 'Updated Name');

      // Verify in database
      const updatedFacility = await prisma.facility.findUnique({
        where: { id: facility.id },
      });
      assert.deepStrictEqual(updatedFacility.name, 'Updated Name');
      assert.deepStrictEqual(updatedFacility.description, 'Updated Description');
      assert.deepStrictEqual(updatedFacility.isActive, false);
    });

    await t.test('updates only provided fields', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Partial Update',
          description: 'Original Description',
          phone: '555-0000',
          isActive: true,
        },
      });

      const response = await app.inject().patch(`/api/admin/facilities/${facility.id}`).payload({
        name: 'Updated Name Only',
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const updatedFacility = await prisma.facility.findUnique({
        where: { id: facility.id },
      });
      assert.deepStrictEqual(updatedFacility.name, 'Updated Name Only');
      assert.deepStrictEqual(updatedFacility.description, 'Original Description'); // Unchanged
      assert.deepStrictEqual(updatedFacility.phone, '555-0000'); // Unchanged
    });

    await t.test('can set fields to null', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Null Test',
          description: 'Some Description',
          phone: '555-1234',
          isActive: true,
        },
      });

      const response = await app.inject().patch(`/api/admin/facilities/${facility.id}`).payload({
        description: null,
        phone: null,
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const updatedFacility = await prisma.facility.findUnique({
        where: { id: facility.id },
      });
      assert.deepStrictEqual(updatedFacility.description, null);
      assert.deepStrictEqual(updatedFacility.phone, null);
    });

    await t.test('returns 404 for non-existent facility', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().patch(`/api/admin/facilities/${nonExistentId}`).payload({
        name: 'Test',
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('requires authentication', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Test Facility',
          isActive: true,
        },
      });

      const response = await app.inject().patch(`/api/admin/facilities/${facility.id}`).payload({
        name: 'Unauthorized Update',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('GET /:id/holds', async (t) => {
    await t.test('returns active holds for facility', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Holds Test Facility',
          isActive: true,
        },
      });

      const serviceType = await prisma.serviceType.create({
        data: {
          code: 'LESC',
          name: 'LESC Service',
        },
      });

      const user = await prisma.user.findUnique({
        where: { email: 'regular.user@test.com' },
      });

      // Create active hold
      const activeHold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: serviceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          status: 'ACTIVE',
          createdById: user.id,
        },
      });

      // Create expired hold (should not be returned)
      await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: serviceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          status: 'ACTIVE',
          createdById: user.id,
        },
      });

      const response = await app.inject().get(`/api/admin/facilities/${facility.id}/holds`).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.ok(Array.isArray(data));
      const holdIds = data.map(h => h.id);
      assert.ok(holdIds.includes(activeHold.id), 'Should include active hold');
      assert.deepStrictEqual(holdIds.length, 1, 'Should only return active hold');
    });

    await t.test('includes hold details with client, createdBy, and incident', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Detailed Holds Facility',
          isActive: true,
        },
      });

      const serviceType = await prisma.serviceType.create({
        data: {
          code: 'LESC',
          name: 'LESC Service',
        },
      });

      const user = await prisma.user.findUnique({
        where: { email: 'regular.user@test.com' },
      });

      const client = await prisma.client.create({
        data: {
          firstName: 'Test',
          lastName: 'Client',
          middleInitial: 'T',
          address: '123 Test St',
          driverLicense: 'DL123',
          localId: 'SF-123',
        },
      });

      const incident = await prisma.incident.create({
        data: {
          cadNumber: 'CAD-123',
          dateTimeArrested: new Date(),
          createdById: user.id,
        },
      });

      const hold = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: serviceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user.id,
          clientId: client.id,
          incidentId: incident.id,
        },
      });

      const response = await app.inject().get(`/api/admin/facilities/${facility.id}/holds`).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      const foundHold = data.find(h => h.id === hold.id);
      assert.ok(foundHold);
      assert.deepStrictEqual(foundHold.facilityId, facility.id);
      assert.deepStrictEqual(foundHold.facilityName, 'Detailed Holds Facility');
      assert.ok(foundHold.client);
      assert.deepStrictEqual(foundHold.client.firstName, 'Test');
      assert.deepStrictEqual(foundHold.client.middleInitial, 'T');
      assert.deepStrictEqual(foundHold.client.address, '123 Test St');
      assert.ok(foundHold.createdBy);
      assert.deepStrictEqual(foundHold.createdBy.id, user.id);
      assert.ok(foundHold.incident);
      assert.deepStrictEqual(foundHold.incident.cadNumber, 'CAD-123');
    });

    await t.test('returns holds from all users (not just current user)', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Multi-User Facility',
          isActive: true,
        },
      });

      const serviceType = await prisma.serviceType.create({
        data: {
          code: 'LESC',
          name: 'LESC Service',
        },
      });

      const user1 = await prisma.user.findUnique({
        where: { email: 'regular.user@test.com' },
      });

      const user2 = await prisma.user.create({
        data: {
          firstName: 'User',
          lastName: 'Two',
          email: `user2-holds-${Date.now()}@test.com`,
          hashedPassword: '$2b$10$ICaCk3VVZUCtO9HySahquuQusQhEnRpXHdzxaceUUJPk0DTwN2e/W', // test
        },
      });

      const hold1 = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: serviceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user1.id,
        },
      });

      const hold2 = await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: serviceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user2.id, // Different user
        },
      });

      const response = await app.inject().get(`/api/admin/facilities/${facility.id}/holds`).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      const holdIds = data.map(h => h.id);
      assert.ok(holdIds.includes(hold1.id), 'Should include user1 hold');
      assert.ok(holdIds.includes(hold2.id), 'Should include user2 hold');
    });

    await t.test('returns 404 for non-existent facility', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().get(`/api/admin/facilities/${nonExistentId}/holds`).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK); // Returns empty array, not 404
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 0);
    });

    await t.test('requires authentication', async () => {
      const facility = await prisma.facility.create({
        data: {
          name: 'Test Facility',
          isActive: true,
        },
      });

      const response = await app.inject().get(`/api/admin/facilities/${facility.id}/holds`);

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });
});
