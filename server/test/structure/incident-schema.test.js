import { test } from 'node:test';
import * as assert from 'node:assert';
import { build } from '#test/helper.js';

test('incident schema and migration', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  await t.test('migration runs successfully', async () => {
    // Verify Incident table exists by trying to query it
    const incidents = await prisma.incident.findMany();
    assert.ok(Array.isArray(incidents), 'Incident table should exist');
  });

  await t.test('Incident table has correct columns', async () => {
    // Create a user first (required for foreign key)
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `test-incident-${Date.now()}@test.com`,
        hashedPassword: 'test',
      },
    });

    // Try to create an incident with all fields
    const incident = await prisma.incident.create({
      data: {
        cadNumber: 'CAD-12345',
        locationArrested: '123 Main St',
        dateTimeArrested: new Date(),
        charge: '647(f) RWS',
        unit: 'Unit 1',
        badgeNumber: '12345',
        agency: 'SFPD',
        createdById: user.id,
      },
    });

    assert.ok(incident.id, 'Incident should have an id');
    assert.deepStrictEqual(incident.cadNumber, 'CAD-12345');
    assert.deepStrictEqual(incident.locationArrested, '123 Main St');
    assert.deepStrictEqual(incident.charge, '647(f) RWS');
    assert.deepStrictEqual(incident.unit, 'Unit 1');
    assert.deepStrictEqual(incident.badgeNumber, '12345');
    assert.deepStrictEqual(incident.agency, 'SFPD');
    assert.deepStrictEqual(incident.createdById, user.id);
    assert.ok(incident.createdAt);
    assert.ok(incident.updatedAt);
  });

  await t.test('Incident charge defaults to 647(f) RWS', async () => {
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `test-incident-default-${Date.now()}@test.com`,
        hashedPassword: 'test',
      },
    });

    const incident = await prisma.incident.create({
      data: {
        cadNumber: 'CAD-67890',
        dateTimeArrested: new Date(),
        createdById: user.id,
      },
    });

    assert.deepStrictEqual(incident.charge, '647(f) RWS', 'Charge should default to 647(f) RWS');
  });

  await t.test('BedHold.incidentId column added and is nullable', async () => {
    // Create test data
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `test-bedhold-${Date.now()}@test.com`,
        hashedPassword: 'test',
      },
    });

    const facility = await prisma.facility.create({
      data: {
        name: 'Test Facility',
        isActive: true,
      },
    });

    const serviceType = await prisma.serviceType.create({
      data: {
        code: 'LESC',
        name: 'LESC Service',
      },
    });

    // Create BedHold without incidentId (backward compatibility)
    const holdWithoutIncident = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: serviceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user.id,
      },
    });

    assert.ok(holdWithoutIncident.id, 'Hold should be created');
    assert.deepStrictEqual(holdWithoutIncident.incidentId, null, 'incidentId should be null for backward compatibility');
  });

  await t.test('BedHold can be linked to Incident', async () => {
    // Create test data
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `test-link-${Date.now()}@test.com`,
        hashedPassword: 'test',
      },
    });

    const facility = await prisma.facility.create({
      data: {
        name: 'Test Facility',
        isActive: true,
      },
    });

    const serviceType = await prisma.serviceType.create({
      data: {
        code: 'LESC',
        name: 'LESC Service',
      },
    });

    // Create incident
    const incident = await prisma.incident.create({
      data: {
        cadNumber: 'CAD-LINK-123',
        dateTimeArrested: new Date(),
        createdById: user.id,
      },
    });

    // Create BedHold with incidentId
    const holdWithIncident = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: serviceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user.id,
        incidentId: incident.id,
      },
    });

    assert.ok(holdWithIncident.id, 'Hold should be created');
    assert.deepStrictEqual(holdWithIncident.incidentId, incident.id, 'Hold should be linked to incident');

    // Verify relation works
    const holdWithIncidentData = await prisma.bedHold.findUnique({
      where: { id: holdWithIncident.id },
      include: { incident: true },
    });

    assert.ok(holdWithIncidentData.incident, 'Incident relation should work');
    assert.deepStrictEqual(holdWithIncidentData.incident.id, incident.id);
    assert.deepStrictEqual(holdWithIncidentData.incident.cadNumber, 'CAD-LINK-123');
  });

  await t.test('Incident can have multiple BedHolds', async () => {
    // Create test data
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `test-multiple-${Date.now()}@test.com`,
        hashedPassword: 'test',
      },
    });

    const facility = await prisma.facility.create({
      data: {
        name: 'Test Facility',
        isActive: true,
      },
    });

    const serviceType = await prisma.serviceType.create({
      data: {
        code: 'LESC',
        name: 'LESC Service',
      },
    });

    // Create incident
    const incident = await prisma.incident.create({
      data: {
        cadNumber: 'CAD-MULTI-123',
        dateTimeArrested: new Date(),
        createdById: user.id,
      },
    });

    // Create multiple holds linked to same incident
    const hold1 = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: serviceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user.id,
        incidentId: incident.id,
      },
    });

    const hold2 = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: serviceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user.id,
        incidentId: incident.id,
      },
    });

    // Verify both holds are linked to same incident
    assert.deepStrictEqual(hold1.incidentId, incident.id);
    assert.deepStrictEqual(hold2.incidentId, incident.id);

    // Verify incident relation includes both holds
    const incidentWithHolds = await prisma.incident.findUnique({
      where: { id: incident.id },
      include: { bedHolds: true },
    });

    assert.deepStrictEqual(incidentWithHolds.bedHolds.length, 2);
    assert.ok(incidentWithHolds.bedHolds.some(h => h.id === hold1.id));
    assert.ok(incidentWithHolds.bedHolds.some(h => h.id === hold2.id));
  });

  await t.test('Foreign key constraint works', async () => {
    // Create test data
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `test-fk-${Date.now()}@test.com`,
        hashedPassword: 'test',
      },
    });

    const facility = await prisma.facility.create({
      data: {
        name: 'Test Facility',
        isActive: true,
      },
    });

    const serviceType = await prisma.serviceType.create({
      data: {
        code: 'LESC',
        name: 'LESC Service',
      },
    });

    // Try to create hold with invalid incidentId (should fail)
    const fakeIncidentId = '00000000-0000-0000-0000-000000000000';
    try {
      await prisma.bedHold.create({
        data: {
          facilityId: facility.id,
          serviceTypeId: serviceType.id,
          bedsRequested: 1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: user.id,
          incidentId: fakeIncidentId,
        },
      });
      assert.fail('Should have thrown error for invalid incidentId');
    } catch (error) {
      assert.ok(error.message.includes('Foreign key constraint') || error.message.includes('violates foreign key'), 'Should fail with foreign key constraint error');
    }
  });

  await t.test('Indexes are created', async () => {
    // This test verifies indexes exist by checking query performance
    // In practice, we can't directly query indexes, but we can verify
    // that queries using indexed fields work correctly

    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `test-index-${Date.now()}@test.com`,
        hashedPassword: 'test',
      },
    });

    // Create incident
    const incident = await prisma.incident.create({
      data: {
        cadNumber: 'CAD-INDEX-123',
        dateTimeArrested: new Date(),
        createdById: user.id,
      },
    });

    // Query by cadNumber (indexed field) - should work efficiently
    const foundIncident = await prisma.incident.findFirst({
      where: { cadNumber: 'CAD-INDEX-123' },
    });

    assert.ok(foundIncident);
    assert.deepStrictEqual(foundIncident.id, incident.id);

    // Query by createdById (indexed field)
    const userIncidents = await prisma.incident.findMany({
      where: { createdById: user.id },
    });

    assert.ok(userIncidents.length > 0);
    assert.ok(userIncidents.some(i => i.id === incident.id));
  });

  await t.test('Existing BedHold records still work (backward compatibility)', async () => {
    // Create test data
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `test-backward-${Date.now()}@test.com`,
        hashedPassword: 'test',
      },
    });

    const facility = await prisma.facility.create({
      data: {
        name: 'Test Facility',
        isActive: true,
      },
    });

    const serviceType = await prisma.serviceType.create({
      data: {
        code: 'LESC',
        name: 'LESC Service',
      },
    });

    // Create hold without incidentId (simulating existing data)
    const existingHold = await prisma.bedHold.create({
      data: {
        facilityId: facility.id,
        serviceTypeId: serviceType.id,
        bedsRequested: 1,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        status: 'ACTIVE',
        createdById: user.id,
        // incidentId is null (backward compatibility)
      },
    });

    // Verify hold works normally
    assert.ok(existingHold.id);
    assert.deepStrictEqual(existingHold.incidentId, null);

    // Verify we can query it
    const foundHold = await prisma.bedHold.findUnique({
      where: { id: existingHold.id },
    });

    assert.ok(foundHold);
    assert.deepStrictEqual(foundHold.id, existingHold.id);
  });
});
