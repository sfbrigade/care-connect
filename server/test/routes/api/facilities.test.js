import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/facilities', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('GET /', async (t) => {
    await t.test('LESC app returns only facilities with LESC service type', async () => {
      // Simulate request from LESC app via Referer header
      const response = await app.inject()
        .get('/api/facilities?include=services')
        .headers({
          ...userHeaders,
          referer: 'http://localhost:3000/lesc/availability',
        });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const facilities = JSON.parse(response.body);

      // Should only return LESC facilities
      assert.ok(Array.isArray(facilities));
      assert.deepStrictEqual(facilities.length, 2);
      const facilityNames = facilities.map(f => f.name).sort();
      assert.deepStrictEqual(facilityNames, ['LESC Facility 1', 'LESC Facility 2']);

      // Verify facilities have LESC service
      facilities.forEach(facility => {
        const hasLescService = facility.services.some(s => s.serviceType.code === 'LESC');
        assert.ok(hasLescService, `Facility ${facility.name} should have LESC service`);
      });
    });

    await t.test('DIDO app excludes facilities with LESC service type', async () => {
      // Simulate request from DIDO app via Referer header
      const response = await app.inject()
        .get('/api/facilities?include=services')
        .headers({
          ...userHeaders,
          referer: 'http://localhost:3000/dido/',
        });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const facilities = JSON.parse(response.body);

      // Should exclude LESC facilities, only return general facilities
      assert.ok(Array.isArray(facilities));
      assert.deepStrictEqual(facilities.length, 2);
      const facilityNames = facilities.map(f => f.name).sort();
      assert.deepStrictEqual(facilityNames, ['General Facility 1', 'General Facility 2']);

      // Verify no facilities have LESC service
      facilities.forEach(facility => {
        const hasLescService = facility.services.some(s => s.serviceType.code === 'LESC');
        assert.ok(!hasLescService, `Facility ${facility.name} should not have LESC service`);
      });
    });

    await t.test('Admin/shared routes return all facilities', async () => {
      // No Referer header or app-specific path - should return all facilities
      const response = await app.inject()
        .get('/api/facilities')
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const facilities = JSON.parse(response.body);

      // Should return all facilities (no filtering)
      assert.ok(Array.isArray(facilities));
      assert.ok(facilities.length >= 4); // At least our test facilities
      const facilityNames = facilities.map(f => f.name);
      assert.ok(facilityNames.includes('LESC Facility 1'));
      assert.ok(facilityNames.includes('LESC Facility 2'));
      assert.ok(facilityNames.includes('General Facility 1'));
      assert.ok(facilityNames.includes('General Facility 2'));
    });

    await t.test('LESC app via subdomain returns only LESC facilities', async () => {
      // Simulate request from LESC subdomain
      const response = await app.inject()
        .get('/api/facilities?include=services')
        .headers({
          ...userHeaders,
          host: 'lesc.localhost:3000',
        });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const facilities = JSON.parse(response.body);

      // Should only return LESC facilities
      assert.ok(Array.isArray(facilities));
      assert.ok(facilities.length >= 2);
      facilities.forEach(facility => {
        const hasLescService = facility.services.some(s => s.serviceType.code === 'LESC');
        assert.ok(hasLescService, `Facility ${facility.name} should have LESC service`);
      });
    });

    await t.test('DIDO app via subdomain excludes LESC facilities', async () => {
      // Simulate request from DIDO subdomain
      const response = await app.inject()
        .get('/api/facilities?include=services')
        .headers({
          ...userHeaders,
          host: 'dido.localhost:3000',
        });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const facilities = JSON.parse(response.body);

      // Should exclude LESC facilities
      assert.ok(Array.isArray(facilities));
      facilities.forEach(facility => {
        const hasLescService = facility.services.some(s => s.serviceType.code === 'LESC');
        assert.ok(!hasLescService, `Facility ${facility.name} should not have LESC service`);
      });
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns facility details with services and contacts', async () => {
      const response = await app.inject().get('/api/facilities/6d123d8f-edd5-4d14-9220-0508eb30b47b').headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.id, '6d123d8f-edd5-4d14-9220-0508eb30b47b');
      assert.deepStrictEqual(data.name, 'LESC Facility 1');
      assert.ok(Array.isArray(data.services));
      assert.deepStrictEqual(data.services.length, 1);
      assert.deepStrictEqual(data.services[0].serviceType.code, 'LESC');
      assert.deepStrictEqual(data.services[0].availableBeds, 10);
      assert.deepStrictEqual(data.services[0].reservedBeds, 2);
      assert.ok(Array.isArray(data.contacts));
      assert.deepStrictEqual(data.contacts.length, 2);
      assert.deepStrictEqual(data.contacts[0].name, 'Jane Doe');
      assert.deepStrictEqual(data.contacts[1].name, 'John Doe');
    });

    await t.test('returns 404 for non-existent facility', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().get(`/api/facilities/${nonExistentId}`).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('POST /', async (t) => {
    await t.test('creates a new facility', async () => {
      const response = await app.inject().post('/api/facilities').payload({
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
      const response = await app.inject().post('/api/facilities').payload({
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
      const response = await app.inject().post('/api/facilities').payload({
        name: 'Unauthorized Facility',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates facility fields', async () => {
      const response = await app.inject().patch('/api/facilities/6d123d8f-edd5-4d14-9220-0508eb30b47b').payload({
        name: 'Updated Name',
        description: 'Updated Description',
        isActive: false,
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.name, 'Updated Name');

      // Verify in database
      const updatedFacility = await prisma.facility.findUnique({
        where: { id: '6d123d8f-edd5-4d14-9220-0508eb30b47b' },
      });
      assert.deepStrictEqual(updatedFacility.name, 'Updated Name');
      assert.deepStrictEqual(updatedFacility.description, 'Updated Description');
      assert.deepStrictEqual(updatedFacility.isActive, false);
    });

    await t.test('updates only provided fields', async () => {
      const response = await app.inject().patch('/api/facilities/6d123d8f-edd5-4d14-9220-0508eb30b47b').payload({
        name: 'Updated Name Only',
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const updatedFacility = await prisma.facility.findUnique({
        where: { id: '6d123d8f-edd5-4d14-9220-0508eb30b47b' },
      });
      assert.deepStrictEqual(updatedFacility.name, 'Updated Name Only');
      assert.deepStrictEqual(updatedFacility.description, 'LESC Facility 1 Description'); // Unchanged
      assert.deepStrictEqual(updatedFacility.phone, '555-0000'); // Unchanged
    });

    await t.test('can set fields to null', async () => {
      const response = await app.inject().patch('/api/facilities/6d123d8f-edd5-4d14-9220-0508eb30b47b').payload({
        description: null,
        phone: null,
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const updatedFacility = await prisma.facility.findUnique({
        where: { id: '6d123d8f-edd5-4d14-9220-0508eb30b47b' },
      });
      assert.deepStrictEqual(updatedFacility.description, null);
      assert.deepStrictEqual(updatedFacility.phone, null);
    });

    await t.test('returns 404 for non-existent facility', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().patch(`/api/facilities/${nonExistentId}`).payload({
        name: 'Test',
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().patch('/api/facilities/6d123d8f-edd5-4d14-9220-0508eb30b47b').payload({
        name: 'Unauthorized Update',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('GET /:id/holds', async (t) => {
    await t.test('returns active holds for facility', async () => {
      const response = await app.inject().get('/api/facilities/6d123d8f-edd5-4d14-9220-0508eb30b47b/holds').headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.ok(Array.isArray(data));
      const holdIds = data.map(h => h.id);
      assert.ok(holdIds.includes('b65ae02b-9b35-43e2-897b-eee6eb5a82e2'), 'Should include active hold');
      assert.deepStrictEqual(holdIds.length, 1, 'Should only return active hold');
    });

    await t.test('includes hold details with client, createdBy, and incident', async () => {
      const response = await app.inject().get('/api/facilities/6d123d8f-edd5-4d14-9220-0508eb30b47b/holds').headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      const foundHold = data.find(h => h.id === 'b65ae02b-9b35-43e2-897b-eee6eb5a82e2');
      assert.ok(foundHold);
      assert.deepStrictEqual(foundHold.facilityId, '6d123d8f-edd5-4d14-9220-0508eb30b47b');
      assert.deepStrictEqual(foundHold.facilityName, 'LESC Facility 1');
      assert.ok(foundHold.client);
      assert.deepStrictEqual(foundHold.client.firstName, 'Test');
      assert.deepStrictEqual(foundHold.client.middleInitial, 'T');
      assert.deepStrictEqual(foundHold.client.address, '123 Test St');
      assert.ok(foundHold.createdBy);
      assert.deepStrictEqual(foundHold.createdBy.id, 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5');
      assert.ok(foundHold.incident);
      assert.deepStrictEqual(foundHold.incident.cadNumber, 'CAD-123');
    });

    await t.test('returns 404 for non-existent facility', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().get(`/api/facilities/${nonExistentId}/holds`).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK); // Returns empty array, not 404
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 0);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().get('/api/facilities/6d123d8f-edd5-4d14-9220-0508eb30b47b/holds');

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });
});
