import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

function assertCareSubjectRedaction (subject) {
  assert.ok(subject);
  assert.strictEqual(subject.middleInitial, null);
  assert.strictEqual(subject.driverLicense, null);
  assert.strictEqual(subject.addressLine1, null);
  assert.strictEqual(subject.addressLine2, null);
  assert.strictEqual(subject.city, null);
  assert.strictEqual(subject.state, null);
  assert.strictEqual(subject.postalCode, null);
  assert.strictEqual(subject.localId, null);
}

test('/api/deflections', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const anotherUserHeaders = await authenticate(app, 'another.user@test.com', 'test');
  const custodyUserHeaders = await authenticate(app, 'sfsouser1@test.com', 'test');
  const careUserHeaders = await authenticate(app, 'careuser1@test.com', 'test');

  await t.test('POST /', async (t) => {
    await t.test('creates a new deflection', async () => {
      await prisma.deflection.expire();

      const response = await app.inject().post('/api/deflections').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        incidentId: 1,
        bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);

      assert.ok(data.id);
      assert.deepStrictEqual(data.facilityId, '6d123d8f-edd5-4d14-9220-0508eb30b47b');
      assert.deepStrictEqual(data.incidentId, 1);
      assert.deepStrictEqual(data.bedTypeId, '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76');
      assert.deepStrictEqual(data.status, 'ACTIVE');

      // Verify in database
      const deflection = await prisma.deflection.findUnique({
        where: { id: data.id },
      });
      assert.ok(deflection);
      assert.deepStrictEqual(deflection.status, 'ACTIVE');

      const bedType = await prisma.bedType.findUnique({
        where: { id: data.bedTypeId },
      });
      assert.ok(bedType);
      assert.deepStrictEqual(bedType.holds, 5);
      assert.deepStrictEqual(bedType.inTransit, 4);
      assert.deepStrictEqual(bedType.available, 3);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject().post('/api/deflections').payload({});
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('validates required fields', async () => {
      const response = await app.inject().post('/api/deflections').payload({
        facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
        // Missing incidentId and bedTypeId
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });
  });

  await t.test('GET /', async (t) => {
    await t.test('returns a list of deflections for the user', async () => {
      const response = await app.inject().get('/api/deflections').headers(anotherUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 3);
    });

    await t.test('returns a list of active deflections for the user', async () => {
      const response = await app.inject().get('/api/deflections?active=true').headers(anotherUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 1);
    });

    await t.test('returns a list of inactive deflections for the user', async () => {
      const response = await app.inject().get('/api/deflections?active=false').headers(anotherUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 0);
    });

    await t.test('redacts restricted subject fields for care users', async () => {
      const response = await app.inject()
        .get('/api/deflections?facilityId=6d123d8f-edd5-4d14-9220-0508eb30b47b&subjectStatus=READY_FOR_INTAKE')
        .headers(careUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 1);
      assert.deepStrictEqual(data[0].subject.firstName, 'Test');
      assert.deepStrictEqual(data[0].subject.lastName, 'Client3');
      assert.ok(data[0].subject.dateOfBirth);
      assert.deepStrictEqual(data[0].subject.sex, 'FEMALE');
      assert.deepStrictEqual(data[0].subject.race, 'HISPANIC');
      assertCareSubjectRedaction(data[0].subject);
    });

    await t.test('does not redact subject fields for field users', async () => {
      const response = await app.inject().get('/api/deflections?active=true').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      const holdWithSubject = data.find(d => d.subject);
      assert.ok(holdWithSubject);
      assert.ok(holdWithSubject.subject.addressLine1);
      assert.ok(holdWithSubject.subject.driverLicense);
      assert.ok(holdWithSubject.subject.localId);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns a single deflection for the owner', async () => {
      const response = await app.inject().get('/api/deflections/4').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, 4);
      assert.deepStrictEqual(data.subject.addressLine1, '123 Test St');
      assert.deepStrictEqual(data.subject.driverLicense, 'DL123');
      assert.deepStrictEqual(data.subject.localId, 'SF-123');
    });

    await t.test('redacts restricted subject fields for care users', async () => {
      const response = await app.inject().get('/api/deflections/4').headers(careUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subject.firstName, 'Test');
      assert.deepStrictEqual(data.subject.lastName, 'Client');
      assert.deepStrictEqual(data.subject.sex, 'MALE');
      assert.deepStrictEqual(data.subject.race, 'WHITE');
      assertCareSubjectRedaction(data.subject);
    });

    await t.test('forbids reading another field user deflection', async () => {
      const response = await app.inject().get('/api/deflections/4').headers(anotherUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates deflection details', async () => {
      const response = await app.inject().patch('/api/deflections/4').payload({
        behavior: 'This is the narrative text.',
        behaviorNarrative: 'Additional details from officer.',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.behavior, 'This is the narrative text.');
      assert.deepStrictEqual(data.behaviorNarrative, 'Additional details from officer.');

      // Verify in database
      const deflection = await prisma.deflection.findUnique({
        where: { id: 4 },
      });
      assert.deepStrictEqual(deflection.behavior, 'This is the narrative text.');
      assert.deepStrictEqual(deflection.behaviorNarrative, 'Additional details from officer.');
    });

    await t.test('returns 404 for non-existent deflection', async () => {
      const nonExistentId = '0';
      const response = await app.inject().patch(`/api/deflections/${nonExistentId}`).payload({
        behavior: 'Cooperative',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('POST /:id/transfer', async (t) => {
    await t.test('transfers custody of a deflection', async () => {
      await prisma.deflection.expire();
      await prisma.deflection.update({
        where: { id: 5 },
        data: {
          subjectStatus: 'ONSITE_AWAITING_TRANSFER',
        }
      });

      let bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 4);

      const response = await app.inject().post('/api/deflections/5/transfer').headers(custodyUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'AWAITING_INTAKE');
      assert.ok(data.transferredAt);
      assert.deepStrictEqual(data.transferredById, '49acdf99-536f-49ac-8138-1c77e5087697');

      // Verify in database
      const deflection = await prisma.deflection.findUnique({
        where: { id: 5 },
      });
      assert.deepStrictEqual(deflection.subjectStatus, 'AWAITING_INTAKE');
      assert.ok(deflection.transferredAt);
      assert.deepStrictEqual(deflection.transferredById, '49acdf99-536f-49ac-8138-1c77e5087697');

      // Verify bed type counts
      bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 2); // in-transit decrements
      assert.deepStrictEqual(bedType.available, 4);
    });
  });

  await t.test('POST /:id/admit', async (t) => {
    await t.test('admits the subject of the deflection', async () => {
      await prisma.deflection.expire();

      let bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 4);

      const response = await app.inject().post('/api/deflections/6/admit').headers(careUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'ADMITTED');
      assert.ok(data.admittedAt);
      assert.ok(data.admittedById);
      assertCareSubjectRedaction(data.subject);

      // Verify in database
      const deflection = await prisma.deflection.findUnique({
        where: { id: 6 },
      });
      assert.deepStrictEqual(deflection.subjectStatus, 'ADMITTED');
      assert.ok(deflection.admittedAt);
      assert.ok(deflection.admittedById);

      // No bed type count changes: both READY_FOR_INTAKE and ADMITTED are hold statuses
      bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 4);
    });
  });

  await t.test('POST /:id/intake-complete', async (t) => {
    await t.test('moves admitted subject to in-chair when intake is completed', async () => {
      await prisma.deflection.update({
        where: { id: 6 },
        data: {
          subjectStatus: 'ADMITTED',
          admittedAt: new Date(),
        },
      });

      const response = await app.inject()
        .post('/api/deflections/6/intake-complete')
        .payload({ completed: true })
        .headers(careUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'IN_CHAIR');
      assertCareSubjectRedaction(data.subject);

      const updated = await prisma.deflection.findUnique({ where: { id: 6 } });
      assert.deepStrictEqual(updated.subjectStatus, 'IN_CHAIR');
    });

    await t.test('moves admitted subject to failed intake when intake is not completed', async () => {
      await prisma.deflection.update({
        where: { id: 6 },
        data: {
          subjectStatus: 'ADMITTED',
          admittedAt: new Date(),
        },
      });

      const response = await app.inject()
        .post('/api/deflections/6/intake-complete')
        .payload({ completed: false })
        .headers(careUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'FAILED_INTAKE');
      assert.ok(data.rejectedAt);
      assert.ok(data.rejectedById);
      assertCareSubjectRedaction(data.subject);

      const updated = await prisma.deflection.findUnique({ where: { id: 6 } });
      assert.deepStrictEqual(updated.subjectStatus, 'FAILED_INTAKE');
      assert.ok(updated.rejectedAt);
      assert.ok(updated.rejectedById);
    });
  });

  await t.test('POST /:id/exit-to-jail', async (t) => {
    await t.test('records direct jail exit from awaiting-intake and releases hold', async () => {
      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        data: { occupied: 0, holds: 5, inTransit: 3, available: 3 },
      });

      const testDeflection = await prisma.deflection.create({
        data: {
          facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
          incidentId: 1,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          subjectStatus: 'AWAITING_INTAKE',
          createdById: '49acdf99-536f-49ac-8138-1c77e5087697',
        },
      });

      const response = await app.inject()
        .post(`/api/deflections/${testDeflection.id}/exit-to-jail`)
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'EXITED');
      assert.deepStrictEqual(data.status, 'COMPLETED');
      assert.deepStrictEqual(data.exitDestinationId, 'jail');
      assert.deepStrictEqual(data.refusalReasonId, 'aggressive_behavior');
      assert.ok(data.exitedAt);
      assert.ok(data.completedAt);
      assert.ok(data.exitedById);

      const bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 4);
    });

    await t.test('records direct jail exit from ready-for-intake and releases hold', async () => {
      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        data: { occupied: 0, holds: 5, inTransit: 3, available: 3 },
      });

      const testDeflection = await prisma.deflection.create({
        data: {
          facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
          incidentId: 1,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          subjectStatus: 'READY_FOR_INTAKE',
          createdById: '49acdf99-536f-49ac-8138-1c77e5087697',
        },
      });

      const response = await app.inject()
        .post(`/api/deflections/${testDeflection.id}/exit-to-jail`)
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'EXITED');
      assert.deepStrictEqual(data.exitDestinationId, 'jail');
      assert.deepStrictEqual(data.refusalReasonId, 'aggressive_behavior');
      assert.ok(data.exitedAt);
      assert.ok(data.exitedById);
      assert.strictEqual(data.releasedAt, null);

      const updatedDeflection = await prisma.deflection.findUnique({ where: { id: testDeflection.id } });
      assert.deepStrictEqual(updatedDeflection.subjectStatus, 'EXITED');
      assert.deepStrictEqual(updatedDeflection.status, 'COMPLETED');
      assert.deepStrictEqual(updatedDeflection.exitDestinationId, 'jail');
      assert.deepStrictEqual(updatedDeflection.refusalReasonId, 'aggressive_behavior');
      assert.ok(updatedDeflection.exitedAt);
      assert.ok(updatedDeflection.completedAt);
      assert.ok(updatedDeflection.exitedById);
      assert.strictEqual(updatedDeflection.releasedAt, null);

      const bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 4);
    });

    await t.test('records direct jail exit from admitted and releases hold', async () => {
      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        data: { occupied: 0, holds: 5, inTransit: 3, available: 3 },
      });

      const testDeflection = await prisma.deflection.create({
        data: {
          facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
          incidentId: 1,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          subjectStatus: 'ADMITTED',
          admittedAt: new Date(),
          admittedById: '49acdf99-536f-49ac-8138-1c77e5087697',
          rejectedAt: null,
          rejectedById: null,
          createdById: '49acdf99-536f-49ac-8138-1c77e5087697',
        },
      });

      const response = await app.inject()
        .post(`/api/deflections/${testDeflection.id}/exit-to-jail`)
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'EXITED');
      assert.deepStrictEqual(data.exitDestinationId, 'jail');
      assert.deepStrictEqual(data.refusalReasonId, 'aggressive_behavior');
      assert.ok(data.exitedAt);
      assert.ok(data.exitedById);
      assert.strictEqual(data.rejectedAt, null);

      const updatedDeflection = await prisma.deflection.findUnique({ where: { id: testDeflection.id } });
      assert.deepStrictEqual(updatedDeflection.subjectStatus, 'EXITED');
      assert.deepStrictEqual(updatedDeflection.exitDestinationId, 'jail');
      assert.deepStrictEqual(updatedDeflection.refusalReasonId, 'aggressive_behavior');
      assert.ok(updatedDeflection.exitedAt);
      assert.ok(updatedDeflection.exitedById);
      assert.strictEqual(updatedDeflection.rejectedAt, null);
      assert.strictEqual(updatedDeflection.rejectedById, null);

      const bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 4);
    });

    await t.test('records direct jail exit from failed intake and releases hold', async () => {
      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        data: { occupied: 0, holds: 5, inTransit: 3, available: 3 },
      });

      const testDeflection = await prisma.deflection.create({
        data: {
          facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
          incidentId: 1,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          subjectStatus: 'FAILED_INTAKE',
          admittedAt: new Date(),
          admittedById: '49acdf99-536f-49ac-8138-1c77e5087697',
          rejectedAt: new Date(),
          rejectedById: '49acdf99-536f-49ac-8138-1c77e5087697',
          createdById: '49acdf99-536f-49ac-8138-1c77e5087697',
        },
      });

      const response = await app.inject()
        .post(`/api/deflections/${testDeflection.id}/exit-to-jail`)
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'EXITED');
      assert.deepStrictEqual(data.exitDestinationId, 'jail');
      assert.deepStrictEqual(data.refusalReasonId, 'aggressive_behavior');
      assert.ok(data.exitedAt);
      assert.ok(data.exitedById);

      const bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 4);
    });

    await t.test('records jail exit from in-chair, releases occupied chair, and marks property returned', async () => {
      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        data: { occupied: 2, holds: 4, inTransit: 3, available: 2 },
      });

      const testDeflection = await prisma.deflection.create({
        data: {
          facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
          incidentId: 1,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          subjectStatus: 'IN_CHAIR',
          admittedAt: new Date(),
          admittedById: '49acdf99-536f-49ac-8138-1c77e5087697',
          property: 'SMALL',
          propertyDetails: 'Black backpack',
          createdById: '49acdf99-536f-49ac-8138-1c77e5087697',
        },
      });

      const response = await app.inject()
        .post(`/api/deflections/${testDeflection.id}/exit-to-jail`)
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'EXITED');
      assert.deepStrictEqual(data.exitDestinationId, 'jail');
      assert.strictEqual(data.releasedAt, null);
      assert.ok(data.exitedAt);
      assert.ok(data.exitedById);
      assert.strictEqual(data.propertyReturned, true);
      assert.ok(data.propertyReturnedAt);
      assert.ok(data.propertyReturnedById);

      const updatedDeflection = await prisma.deflection.findUnique({ where: { id: testDeflection.id } });
      assert.deepStrictEqual(updatedDeflection.subjectStatus, 'EXITED');
      assert.deepStrictEqual(updatedDeflection.exitDestinationId, 'jail');
      assert.strictEqual(updatedDeflection.releasedAt, null);
      assert.strictEqual(updatedDeflection.propertyReturned, true);
      assert.ok(updatedDeflection.propertyReturnedAt);
      assert.ok(updatedDeflection.propertyReturnedById);

      const updates = await prisma.deflectionUpdate.findMany({ where: { deflectionId: testDeflection.id } });
      const lastUpdate = updates[updates.length - 1];
      assert.strictEqual(lastUpdate.status, 'COMPLETED');
      assert.strictEqual(lastUpdate.subjectStatus, 'EXITED');
      assert.strictEqual(lastUpdate.exitDestinationId, 'jail');
      assert.strictEqual(lastUpdate.propertyReturned, true);

      const custodyListResponse = await app.inject()
        .get('/api/deflections?facilityId=6d123d8f-edd5-4d14-9220-0508eb30b47b&subjectStatus=RELEASED,EXITED')
        .headers(custodyUserHeaders);
      assert.deepStrictEqual(custodyListResponse.statusCode, StatusCodes.OK);
      const custodyList = JSON.parse(custodyListResponse.body);
      const transferredToJailRecord = custodyList.find(d => d.id === testDeflection.id);
      assert.ok(transferredToJailRecord);
      assert.strictEqual(transferredToJailRecord.subjectStatus, 'EXITED');
      assert.strictEqual(transferredToJailRecord.exitDestinationId, 'jail');
      assert.strictEqual(transferredToJailRecord.releasedAt, null);

      const bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 1);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 3);
    });

    await t.test('returns conflict when deflection status is not eligible for exit-to-jail', async () => {
      const response = await app.inject()
        .post('/api/deflections/4/exit-to-jail')
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CONFLICT);
    });
  });

  await t.test('POST /:id/record-death', async (t) => {
    await t.test('records death in custody and releases a hold for pre-intake statuses', async () => {
      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        data: { occupied: 0, holds: 5, inTransit: 3, available: 3 },
      });

      const testDeflection = await prisma.deflection.create({
        data: {
          facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
          incidentId: 1,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          subjectStatus: 'READY_FOR_INTAKE',
          createdById: '49acdf99-536f-49ac-8138-1c77e5087697',
        },
      });

      const response = await app.inject()
        .post(`/api/deflections/${testDeflection.id}/record-death`)
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'DEATH_IN_CUSTODY');
      assert.deepStrictEqual(data.status, 'COMPLETED');
      assert.deepStrictEqual(data.releaseReasonId, 'death_in_custody');
      assert.ok(data.completedAt);

      const updatedDeflection = await prisma.deflection.findUnique({ where: { id: testDeflection.id } });
      assert.deepStrictEqual(updatedDeflection.subjectStatus, 'DEATH_IN_CUSTODY');
      assert.deepStrictEqual(updatedDeflection.status, 'COMPLETED');
      assert.deepStrictEqual(updatedDeflection.releaseReasonId, 'death_in_custody');
      assert.ok(updatedDeflection.completedAt);

      const bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 4);
    });

    await t.test('records death in facility for legally released status and releases occupied chair', async () => {
      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        data: { occupied: 1, holds: 4, inTransit: 3, available: 4 },
      });

      const testDeflection = await prisma.deflection.create({
        data: {
          facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
          incidentId: 1,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          subjectStatus: 'RELEASED',
          releasedAt: new Date(),
          releasedById: '49acdf99-536f-49ac-8138-1c77e5087697',
          createdById: '49acdf99-536f-49ac-8138-1c77e5087697',
        },
      });

      const response = await app.inject()
        .post(`/api/deflections/${testDeflection.id}/record-death`)
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'DEATH_IN_FACILITY');
      assert.deepStrictEqual(data.status, 'COMPLETED');
      assert.deepStrictEqual(data.releaseReasonId, 'death_in_facility');
      assert.ok(data.completedAt);

      const updatedDeflection = await prisma.deflection.findUnique({ where: { id: testDeflection.id } });
      assert.deepStrictEqual(updatedDeflection.subjectStatus, 'DEATH_IN_FACILITY');
      assert.deepStrictEqual(updatedDeflection.status, 'COMPLETED');
      assert.deepStrictEqual(updatedDeflection.releaseReasonId, 'death_in_facility');
      assert.ok(updatedDeflection.completedAt);

      const bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 5);

      const custodyListResponse = await app.inject()
        .get('/api/deflections?facilityId=6d123d8f-edd5-4d14-9220-0508eb30b47b&subjectStatus=AWAITING_INTAKE,FAILED_INTAKE,READY_FOR_INTAKE,ADMITTED,IN_CHAIR,RELEASED,EXITED')
        .headers(custodyUserHeaders);
      assert.deepStrictEqual(custodyListResponse.statusCode, StatusCodes.OK);
      const listData = JSON.parse(custodyListResponse.body);
      assert.ok(Array.isArray(listData));
      assert.ok(!listData.some(d => d.id === testDeflection.id));
    });

    await t.test('returns conflict when status is not eligible for death recording', async () => {
      const response = await app.inject()
        .post('/api/deflections/4/record-death')
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CONFLICT);
    });
  });

  await t.test('POST /:id/property-return', async (t) => {
    async function createReleasedDeflection ({
      subjectStatus = 'RELEASED',
      property = 'SMALL',
      propertyDetails = 'Black backpack',
      propertyReturned = null,
      propertyNotReturnedReason = null,
      propertyNotReturnedOtherReason = null,
    } = {}) {
      return prisma.deflection.create({
        data: {
          facilityId: '6d123d8f-edd5-4d14-9220-0508eb30b47b',
          incidentId: 1,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          subjectStatus,
          property,
          propertyDetails,
          propertyReturned,
          propertyNotReturnedReason,
          propertyNotReturnedOtherReason,
          createdById: '49acdf99-536f-49ac-8138-1c77e5087697',
          releasedAt: subjectStatus === 'RELEASED' ? new Date() : null,
          releasedById: subjectStatus === 'RELEASED' ? '49acdf99-536f-49ac-8138-1c77e5087697' : null,
        },
      });
    }

    await t.test('records property returned as yes for a legally released person with property', async () => {
      const deflection = await createReleasedDeflection();

      const response = await app.inject()
        .post(`/api/deflections/${deflection.id}/property-return`)
        .payload({ propertyReturned: true })
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.propertyReturned, true);
      assert.strictEqual(data.propertyNotReturnedReason, null);
      assert.strictEqual(data.propertyNotReturnedOtherReason, null);
      assert.ok(data.propertyReturnedAt);
      assert.ok(data.propertyReturnedById);
    });

    await t.test('records property not returned with reason and otherReason', async () => {
      const deflection = await createReleasedDeflection();

      const response = await app.inject()
        .post(`/api/deflections/${deflection.id}/property-return`)
        .payload({ propertyReturned: false, propertyNotReturnedReason: 'OTHER', propertyNotReturnedOtherReason: 'Evidence hold' })
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.propertyReturned, false);
      assert.deepStrictEqual(data.propertyNotReturnedReason, 'OTHER');
      assert.deepStrictEqual(data.propertyNotReturnedOtherReason, 'Evidence hold');
      assert.ok(data.propertyReturnedAt);
      assert.ok(data.propertyReturnedById);
    });

    await t.test('returns conflict with ALREADY_RECORDED when property return was already recorded', async () => {
      const deflection = await createReleasedDeflection({
        propertyReturned: true,
      });

      const response = await app.inject()
        .post(`/api/deflections/${deflection.id}/property-return`)
        .payload({ propertyReturned: true })
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CONFLICT);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.code, 'ALREADY_RECORDED');
    });

    await t.test('returns 422 when returned=false and reason is missing', async () => {
      const deflection = await createReleasedDeflection();

      const response = await app.inject()
        .post(`/api/deflections/${deflection.id}/property-return`)
        .payload({ propertyReturned: false })
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('returns 422 when reason is OTHER and otherReason is missing', async () => {
      const deflection = await createReleasedDeflection();

      const response = await app.inject()
        .post(`/api/deflections/${deflection.id}/property-return`)
        .payload({ propertyReturned: false, propertyNotReturnedReason: 'OTHER' })
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('returns conflict when deflection is not legally released', async () => {
      const deflection = await createReleasedDeflection({
        subjectStatus: 'IN_CHAIR',
      });

      const response = await app.inject()
        .post(`/api/deflections/${deflection.id}/property-return`)
        .payload({ propertyReturned: true })
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CONFLICT);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.code, 'NOT_LEGALLY_RELEASED');
    });

    await t.test('returns conflict when no property is associated', async () => {
      const deflection = await createReleasedDeflection({
        property: null,
        propertyDetails: null,
      });

      const response = await app.inject()
        .post(`/api/deflections/${deflection.id}/property-return`)
        .payload({ propertyReturned: true })
        .headers(custodyUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CONFLICT);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.code, 'NO_ASSOCIATED_PROPERTY');
    });
  });

  await t.test('PUT /:id/subject', async (t) => {
    await t.test('creates a new subject for a deflection', async () => {
      const response = await app.inject().put('/api/deflections/2/subject').payload({
        firstName: 'John',
        lastName: 'Doe',
        middleInitial: 'D',
        dateOfBirth: '1988-05-25',
        sex: 'MALE',
        race: 'WHITE',
        addressLine1: '123 Main St',
        addressLine2: 'Apt 1',
        driverLicense: 'DL1234',
        localId: '1234',
        narcoticsSubstance: false,
        narcoticsParaphernalia: true,
        drugUseEvidence: true,
        drugType: 'ALCOHOL',
      }).headers(anotherUserHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subject.firstName, 'John');
      assert.deepStrictEqual(data.subject.lastName, 'Doe');
      assert.deepStrictEqual(data.subject.middleInitial, 'D');
      assert.deepStrictEqual(data.subject.dateOfBirth, '1988-05-25T00:00:00.000Z');
      assert.deepStrictEqual(data.subject.sex, 'MALE');
      assert.deepStrictEqual(data.subject.race, 'WHITE');
      assert.deepStrictEqual(data.subject.addressLine1, '123 Main St');
      assert.deepStrictEqual(data.subject.addressLine2, 'Apt 1');
      assert.deepStrictEqual(data.subject.driverLicense, 'DL1234');
      assert.deepStrictEqual(data.subject.localId, '1234');
      assert.deepStrictEqual(data.narcoticsSubstance, false);
      assert.deepStrictEqual(data.narcoticsParaphernalia, true);
      assert.deepStrictEqual(data.drugUseEvidence, true);
      assert.deepStrictEqual(data.drugType, 'ALCOHOL');

      const { subjectId } = data;
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
      });
      assert.deepStrictEqual(subject.firstName, 'John');
      assert.deepStrictEqual(subject.lastName, 'Doe');
      assert.deepStrictEqual(subject.middleInitial, 'D');
      assert.deepStrictEqual(subject.dateOfBirth, new Date('1988-05-25T00:00:00.000Z'));
      assert.deepStrictEqual(subject.sex, 'MALE');
      assert.deepStrictEqual(subject.race, 'WHITE');
      assert.deepStrictEqual(subject.addressLine1, '123 Main St');
      assert.deepStrictEqual(subject.addressLine2, 'Apt 1');
      assert.deepStrictEqual(subject.driverLicense, 'DL1234');
      assert.deepStrictEqual(subject.localId, '1234');

      const deflection = await prisma.deflection.findUnique({
        where: { id: 2 },
      });
      assert.deepStrictEqual(deflection.narcoticsSubstance, false);
      assert.deepStrictEqual(deflection.narcoticsParaphernalia, true);
      assert.deepStrictEqual(deflection.drugUseEvidence, true);
      assert.deepStrictEqual(deflection.drugType, 'ALCOHOL');
    });

    await t.test('updates the subject of a deflection', async () => {
      const response = await app.inject().put('/api/deflections/4/subject').payload({
        firstName: 'Jane',
        lastName: 'Doe',
        middleInitial: 'D',
        dateOfBirth: '1988-05-25',
        sex: 'FEMALE',
        race: 'ASIAN',
        addressLine1: '555 Main St',
        addressLine2: 'Apt 1',
        driverLicense: 'DL9876',
        localId: '9876',
        narcoticsSubstance: false,
        narcoticsParaphernalia: true,
        drugUseEvidence: false,
        drugType: 'HEROIN',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.subject.firstName, 'Jane');
      assert.deepStrictEqual(data.subject.lastName, 'Doe');
      assert.deepStrictEqual(data.subject.middleInitial, 'D');
      assert.deepStrictEqual(data.subject.dateOfBirth, '1988-05-25T00:00:00.000Z');
      assert.deepStrictEqual(data.subject.sex, 'FEMALE');
      assert.deepStrictEqual(data.subject.race, 'ASIAN');
      assert.deepStrictEqual(data.subject.addressLine1, '555 Main St');
      assert.deepStrictEqual(data.subject.addressLine2, 'Apt 1');
      assert.deepStrictEqual(data.subject.driverLicense, 'DL9876');
      assert.deepStrictEqual(data.subject.localId, '9876');
      assert.deepStrictEqual(data.narcoticsSubstance, false);
      assert.deepStrictEqual(data.narcoticsParaphernalia, true);
      assert.deepStrictEqual(data.drugUseEvidence, false);
      assert.deepStrictEqual(data.drugType, null);

      // Verify in database
      const subject = await prisma.subject.findUnique({
        where: { id: 'a95b66ee-f5f3-4e59-87d8-b56afdfd7ab5' },
      });
      assert.deepStrictEqual(subject.firstName, 'Jane');
      assert.deepStrictEqual(subject.lastName, 'Doe');
      assert.deepStrictEqual(subject.middleInitial, 'D');
      assert.deepStrictEqual(subject.dateOfBirth, new Date('1988-05-25T00:00:00.000Z'));
      assert.deepStrictEqual(subject.sex, 'FEMALE');
      assert.deepStrictEqual(subject.race, 'ASIAN');
      assert.deepStrictEqual(subject.addressLine1, '555 Main St');
      assert.deepStrictEqual(subject.addressLine2, 'Apt 1');
      assert.deepStrictEqual(subject.driverLicense, 'DL9876');
      assert.deepStrictEqual(subject.localId, '9876');

      const deflection = await prisma.deflection.findUnique({
        where: { id: 4 },
      });
      assert.deepStrictEqual(deflection.narcoticsSubstance, false);
      assert.deepStrictEqual(deflection.narcoticsParaphernalia, true);
      assert.deepStrictEqual(deflection.drugUseEvidence, false);
      assert.deepStrictEqual(deflection.drugType, null);
    });
  });

  await t.test('DELETE /:id', async (t) => {
    await t.test('blocks hospital cancellation when hold details are incomplete', async () => {
      const response = await app.inject().delete('/api/deflections/4?cancelReasonId=hospital').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.error, 'SFPD policy requires person details to be completed before a medical-related cancelation');

      assert.deepStrictEqual(app.backgroundJobs._sent.length, 0);
    });

    await t.test('queues 647f generation when a completed hold is cancelled for hospital', async () => {
      await prisma.incident.update({
        where: { id: 1 },
        data: {
          addressLine1: '100 Main St',
          city: 'San Francisco',
          state: 'CA',
          supervisorBadgeNumber: '1234',
        },
      });
      await prisma.deflection.update({
        where: { id: 4 },
        data: {
          narcoticsSubstance: false,
          narcoticsParaphernalia: false,
          drugUseEvidence: false,
          drugType: null,
          behavior: 'Subject was unable to care for self.',
          behaviorNarrative: 'Additional narrative.',
          property: 'NONE',
        },
      });

      const response = await app.inject().delete('/api/deflections/4?cancelReasonId=hospital').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'CANCELLED');
      assert.deepStrictEqual(data.cancelReasonId, 'hospital');

      assert.deepStrictEqual(app.backgroundJobs._sent.length, 1);
      assert.deepStrictEqual(app.backgroundJobs._sent[0].name, 'generate-forms');
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data, {
        deflectionId: 4,
        userId: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5',
        formIds: ['647f'],
        emailTemplate: 'transfer-form',
      });
    });

    await t.test('cancels the deflection', async () => {
      await prisma.deflection.expire();

      let response = await app.inject().delete('/api/deflections/4?cancelReasonId=5150').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'CANCELLED');
      assert.deepStrictEqual(data.cancelReasonId, '5150');
      assert.ok(data.cancelledAt);
      assert.ok(data.cancelledById);

      // Verify in database
      const deflection = await prisma.deflection.findUnique({
        where: { id: 4 },
      });
      assert.deepStrictEqual(deflection.status, 'CANCELLED');
      assert.deepStrictEqual(deflection.cancelReasonId, '5150');
      assert.ok(deflection.cancelledAt);
      assert.ok(deflection.cancelledById);

      let bedType = await prisma.bedType.findUnique({
        where: { id: deflection.bedTypeId },
      });
      assert.deepStrictEqual(bedType.holds, 3);
      assert.deepStrictEqual(bedType.inTransit, 2);
      assert.deepStrictEqual(bedType.available, 5);

      response = await app.inject().delete('/api/deflections/5?cancelReasonId=5150').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      bedType = await prisma.bedType.findUnique({
        where: { id: deflection.bedTypeId },
      });
      assert.deepStrictEqual(bedType.holds, 2);
      assert.deepStrictEqual(bedType.inTransit, 1);
      assert.deepStrictEqual(bedType.available, 6);

      response = await app.inject().delete('/api/deflections/6?cancelReasonId=5150').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      bedType = await prisma.bedType.findUnique({
        where: { id: deflection.bedTypeId },
      });
      assert.deepStrictEqual(bedType.holds, 1);
      assert.deepStrictEqual(bedType.inTransit, 1); // deflection 6 is READY_FOR_INTAKE so is NOT considered in transit
      assert.deepStrictEqual(bedType.available, 7);

      // incident is marked completed after cancellation of the last hold
      const incident = await prisma.incident.findUnique({
        where: { id: deflection.incidentId },
      });
      assert.ok(incident.completedAt);
    });

    await t.test('returns 404 for non-existent deflection', async () => {
      const nonExistentId = '0';
      const response = await app.inject().delete(`/api/deflections/${nonExistentId}`).payload({}).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('POST /:id/reopen', async (t) => {
    await t.test('reopens a cancelled deflection', async () => {
      await prisma.deflection.expire();
      await app.inject().delete('/api/deflections/4?cancelReasonId=5150').headers(userHeaders);

      let deflection = await prisma.deflection.findUnique({ where: { id: 4 } });
      const bedTypeBefore = await prisma.bedType.findUnique({ where: { id: deflection.bedTypeId } });

      const response = await app.inject().post(`/api/deflections/${deflection.id}/reopen`).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.status, 'ACTIVE');
      assert.deepStrictEqual(data.cancelReasonId, null);
      assert.ok(data.expiresAt);

      deflection = await prisma.deflection.findUnique({ where: { id: 4 } });
      assert.deepStrictEqual(deflection.status, 'ACTIVE');

      const bedTypeAfter = await prisma.bedType.findUnique({ where: { id: deflection.bedTypeId } });
      assert.deepStrictEqual(bedTypeAfter.holds, bedTypeBefore.holds + 1);
      assert.deepStrictEqual(bedTypeAfter.inTransit, bedTypeBefore.inTransit + 1);
      assert.deepStrictEqual(bedTypeAfter.available, bedTypeBefore.available - 1);
    });

    await t.test('returns 400 if incident is completed', async () => {
      await prisma.deflection.expire();
      await app.inject().delete('/api/deflections/4?cancelReasonId=5150').headers(userHeaders);
      await app.inject().delete('/api/deflections/5?cancelReasonId=5150').headers(userHeaders);
      await app.inject().delete('/api/deflections/6?cancelReasonId=5150').headers(userHeaders);

      const response = await app.inject().post('/api/deflections/4/reopen').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.error, 'Incident is already completed');
    });

    await t.test('returns 400 if deflection is not cancelled or expired', async () => {
      const response = await app.inject().post('/api/deflections/1/reopen').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.BAD_REQUEST);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.error, 'Deflection is not cancelled or expired');
    });

    await t.test('returns 409 if no available beds', async () => {
      await prisma.deflection.expire();
      await app.inject().delete('/api/deflections/4?cancelReasonId=5150').headers(userHeaders);

      const deflection = await prisma.deflection.findUnique({ where: { id: 4 } });
      await prisma.bedType.update({
        where: { id: deflection.bedTypeId },
        data: { available: 0 },
      });

      const response = await app.inject().post('/api/deflections/4/reopen').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.CONFLICT);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.error, 'No available beds');
    });

    await t.test('returns 404 for non-existent deflection', async () => {
      const response = await app.inject().post('/api/deflections/0/reopen').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('POST /:id/exit-details', async (t) => {
    await t.test('records exit details but keeps status as IN_CHAIR', async () => {
      await app.prisma.deflection.update({
        where: { id: 6 },
        data: { subjectStatus: 'IN_CHAIR' },
      });

      const response = await app.inject()
        .post('/api/deflections/6/exit-details')
        .headers(careUserHeaders)
        .payload({
          exitDestinationId: 'home',
          exitHousingStatusId: 'permanent',
          exitSFResident: 'UNKNOWN',
          exitConnectedToCare: 'YES',
        });

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.strictEqual(data.subjectStatus, 'IN_CHAIR');
      assert.strictEqual(data.exitDestinationId, 'home');
      assert.strictEqual(data.exitHousingStatusId, 'permanent');
      assert.strictEqual(data.exitSFResident, 'UNKNOWN');
      assert.strictEqual(data.exitConnectedToCare, 'YES');
      // Should not set exitedAt/exitedById
      assert.strictEqual(data.exitedAt, null);
      assert.strictEqual(data.exitedById, null);

      // Verify DB state
      const dbDeflection = await app.prisma.deflection.findUnique({ where: { id: 6 } });
      assert.strictEqual(dbDeflection.subjectStatus, 'IN_CHAIR');
      assert.strictEqual(dbDeflection.exitDestinationId, 'home');
      assert.strictEqual(dbDeflection.exitHousingStatusId, 'permanent');
      assert.strictEqual(dbDeflection.exitSFResident, 'UNKNOWN');
      assert.strictEqual(dbDeflection.exitConnectedToCare, 'YES');

      // Verify deflection update history
      const updates = await app.prisma.deflectionUpdate.findMany({ where: { deflectionId: 6 } });
      const lastUpdate = updates[updates.length - 1];
      assert.strictEqual(lastUpdate.subjectStatus, null); // Hasn't changed
      assert.strictEqual(lastUpdate.exitDestinationId, 'home');
      assert.strictEqual(lastUpdate.exitHousingStatusId, 'permanent');
      assert.strictEqual(lastUpdate.exitSFResident, 'UNKNOWN');
      assert.strictEqual(lastUpdate.exitConnectedToCare, 'YES');
    });

    await t.test('requires care user role', async () => {
      const response = await app.inject()
        .post('/api/deflections/6/exit-details')
        .headers(userHeaders)
        .payload({
          exitDestinationId: 'home',
          exitHousingStatusId: 'permanent',
          exitSFResident: 'NO',
          exitConnectedToCare: 'NO',
        });

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 409 if not IN_CHAIR', async () => {
      await app.prisma.deflection.update({
        where: { id: 5 },
        data: { subjectStatus: 'READY_FOR_INTAKE' },
      });

      const response = await app.inject()
        .post('/api/deflections/5/exit-details')
        .headers(careUserHeaders)
        .payload({
          exitDestinationId: 'home',
          exitHousingStatusId: 'permanent',
          exitSFResident: 'NO',
          exitConnectedToCare: 'NO',
        });

      assert.strictEqual(response.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('returns 404 for non-existent deflection', async () => {
      const response = await app.inject()
        .post('/api/deflections/99999/exit-details')
        .headers(careUserHeaders)
        .payload({
          exitDestinationId: 'home',
          exitHousingStatusId: 'permanent',
          exitSFResident: 'NO',
          exitConnectedToCare: 'NO',
        });

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('POST /:id/exit', async (t) => {
    await t.test('records exit details and transitions to EXITED', async () => {
      // Put deflection in IN_CHAIR so it's valid to exit
      await app.prisma.deflection.update({
        where: { id: 6 },
        data: { subjectStatus: 'IN_CHAIR' },
      });

      const response = await app.inject()
        .post('/api/deflections/6/exit')
        .headers(careUserHeaders)
        .payload({
          exitDestinationId: 'home',
          exitHousingStatusId: 'permanent',
          exitSFResident: 'YES',
          exitConnectedToCare: 'YES',
        });

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.strictEqual(data.subjectStatus, 'EXITED');
      assert.strictEqual(data.status, 'COMPLETED');
      assert.strictEqual(data.exitDestinationId, 'home');
      assert.strictEqual(data.exitHousingStatusId, 'permanent');
      assert.strictEqual(data.exitSFResident, 'YES');
      assert.strictEqual(data.exitConnectedToCare, 'YES');
      assert.ok(data.completedAt);
      assert.ok(data.exitedAt);
      assert.ok(data.exitedById);

      // Verify DB state
      const dbDeflection = await app.prisma.deflection.findUnique({ where: { id: 6 } });
      assert.strictEqual(dbDeflection.subjectStatus, 'EXITED');
      assert.strictEqual(dbDeflection.status, 'COMPLETED');
      assert.strictEqual(dbDeflection.exitDestinationId, 'home');
      assert.strictEqual(dbDeflection.exitHousingStatusId, 'permanent');
      assert.strictEqual(dbDeflection.exitSFResident, 'YES');
      assert.strictEqual(dbDeflection.exitConnectedToCare, 'YES');
      assert.ok(dbDeflection.completedAt);
      assert.ok(dbDeflection.exitedAt);
      assert.ok(dbDeflection.exitedById);

      // Verify deflection update history
      const updates = await app.prisma.deflectionUpdate.findMany({ where: { deflectionId: 6 } });
      const lastUpdate = updates[updates.length - 1];
      assert.strictEqual(lastUpdate.status, 'COMPLETED');
      assert.strictEqual(lastUpdate.subjectStatus, 'EXITED');
      assert.strictEqual(lastUpdate.exitDestinationId, 'home');
      assert.strictEqual(lastUpdate.exitHousingStatusId, 'permanent');
      assert.strictEqual(lastUpdate.exitSFResident, 'YES');
      assert.strictEqual(lastUpdate.exitConnectedToCare, 'YES');
    });

    await t.test('requires care user role', async () => {
      const response = await app.inject()
        .post('/api/deflections/6/exit')
        .headers(userHeaders)
        .payload({
          exitDestinationId: 'home',
          exitHousingStatusId: 'permanent',
          exitSFResident: 'NO',
          exitConnectedToCare: 'NO',
        });

      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 409 if not IN_CHAIR', async () => {
      await app.prisma.deflection.update({
        where: { id: 5 },
        data: { subjectStatus: 'ADMITTED' },
      });

      const response = await app.inject()
        .post('/api/deflections/5/exit')
        .headers(careUserHeaders)
        .payload({
          exitDestinationId: 'home',
          exitHousingStatusId: 'permanent',
          exitSFResident: 'NO',
          exitConnectedToCare: 'NO',
        });

      assert.strictEqual(response.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('returns 404 for non-existent deflection', async () => {
      const response = await app.inject()
        .post('/api/deflections/99999/exit')
        .headers(careUserHeaders)
        .payload({
          exitDestinationId: 'home',
          exitHousingStatusId: 'permanent',
          exitSFResident: 'UNKNOWN',
          exitConnectedToCare: 'UNKNOWN',
        });

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('POST /:id/release', async (t) => {
    await t.test('records medical release from pre-intake status and releases hold', async () => {
      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        data: { occupied: 0, holds: 5, inTransit: 3, available: 3 },
      });
      await prisma.deflection.update({
        where: { id: 6 },
        data: {
          subjectStatus: 'READY_FOR_INTAKE',
          releasedAt: null,
          releasedById: null,
          releaseReasonId: null,
          exitedAt: null,
          exitedById: null,
          exitDestinationId: null,
        },
      });

      const response = await app.inject()
        .post('/api/deflections/6/release')
        .headers(custodyUserHeaders)
        .payload({
          releaseReasonId: 'medical_issue',
          exitDestinationId: 'hospital',
        });

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.strictEqual(data.subjectStatus, 'EXITED');
      assert.strictEqual(data.status, 'COMPLETED');
      assert.strictEqual(data.releaseReasonId, 'medical_issue');
      assert.strictEqual(data.exitDestinationId, 'hospital');
      assert.ok(data.completedAt);

      const bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 4);
    });

    await t.test('records medical release from occupied-backed state and releases occupied chair', async () => {
      await prisma.deflection.expire();
      await prisma.bedType.update({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        data: { occupied: 1, holds: 4, inTransit: 3, available: 4 },
      });
      await prisma.deflection.update({
        where: { id: 6 },
        data: {
          subjectStatus: 'IN_CHAIR',
          releasedAt: null,
          releasedById: null,
          releaseReasonId: null,
          exitedAt: null,
          exitedById: null,
          exitDestinationId: null,
        },
      });

      const response = await app.inject()
        .post('/api/deflections/6/release')
        .headers(custodyUserHeaders)
        .payload({
          releaseReasonId: 'medical_issue',
          exitDestinationId: 'hospital',
        });

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.strictEqual(data.subjectStatus, 'EXITED');
      assert.strictEqual(data.status, 'COMPLETED');
      assert.strictEqual(data.releaseReasonId, 'medical_issue');
      assert.strictEqual(data.exitDestinationId, 'hospital');
      assert.ok(data.completedAt);

      const bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 0);
      assert.deepStrictEqual(bedType.holds, 4);
      assert.deepStrictEqual(bedType.inTransit, 3);
      assert.deepStrictEqual(bedType.available, 5);
    });

    await t.test('marks a subject as legally released (simple sobered)', async () => {
      const response = await app.inject()
        .post('/api/deflections/6/release')
        .headers(custodyUserHeaders)
        .payload({
          releaseReasonId: 'sobered',
        });

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.strictEqual(data.subjectStatus, 'RELEASED');
      assert.strictEqual(data.status, 'ACTIVE');
      assert.strictEqual(data.releaseReasonId, 'sobered');
      assert.ok(data.releasedAt);
      assert.ok(data.releasedById);
      assert.strictEqual(data.completedAt, null);

      // Verify DB state
      const dbDeflection = await prisma.deflection.findUnique({ where: { id: 6 } });
      assert.strictEqual(dbDeflection.subjectStatus, 'RELEASED');
      assert.strictEqual(dbDeflection.status, 'ACTIVE');
      assert.strictEqual(dbDeflection.releaseReasonId, 'sobered');
      assert.ok(dbDeflection.releasedAt);
      assert.strictEqual(dbDeflection.completedAt, null);

      // Verify deflection update history
      const updates = await prisma.deflectionUpdate.findMany({ where: { deflectionId: 6 } });
      const lastUpdate = updates[updates.length - 1];
      assert.strictEqual(lastUpdate.status, null);
      assert.strictEqual(lastUpdate.subjectStatus, 'RELEASED');
    });

    await t.test('marks a subject as legally released (medical issue)', async () => {
      // Setup: reset deflection 6 status
      await prisma.deflection.update({
        where: { id: 6 },
        data: { subjectStatus: 'ADMITTED', releasedAt: null, releasedById: null, releaseReasonId: null },
      });

      const response = await app.inject()
        .post('/api/deflections/6/release')
        .headers(custodyUserHeaders)
        .payload({
          releaseReasonId: 'medical_issue',
          exitDestinationId: 'hospital',
        });

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.strictEqual(data.subjectStatus, 'EXITED');
      assert.strictEqual(data.status, 'COMPLETED');
      assert.strictEqual(data.releaseReasonId, 'medical_issue');
      assert.strictEqual(data.exitDestinationId, 'hospital');
      assert.ok(data.completedAt);
      assert.ok(data.releasedAt);
      assert.ok(data.exitedAt);

      // Verify DB state
      const dbDeflection = await prisma.deflection.findUnique({ where: { id: 6 } });
      assert.strictEqual(dbDeflection.subjectStatus, 'EXITED');
      assert.strictEqual(dbDeflection.status, 'COMPLETED');
      assert.ok(dbDeflection.completedAt);
      assert.ok(dbDeflection.exitedAt);
    });

    await t.test('marks a subject as legally released (other)', async () => {
      // Setup: reset deflection 6 status
      await prisma.deflection.update({
        where: { id: 6 },
        data: { subjectStatus: 'ADMITTED', releasedAt: null, releasedById: null, releaseReasonId: null, exitedAt: null, exitDestinationId: null },
      });

      const response = await app.inject()
        .post('/api/deflections/6/release')
        .headers(custodyUserHeaders)
        .payload({
          releaseReasonId: 'other',
          otherReleaseReason: 'Friend picked them up',
          otherReleaseDestination: 'Home address',
        });

      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.strictEqual(data.subjectStatus, 'EXITED');
      assert.strictEqual(data.status, 'COMPLETED');
      assert.strictEqual(data.releaseReasonId, 'other');
      assert.strictEqual(data.otherReleaseReason, 'Friend picked them up');
      assert.strictEqual(data.otherReleaseDestination, 'Home address');
      assert.ok(data.completedAt);
    });

    await t.test('returns 422 if medical release misses exit destination', async () => {
      const response = await app.inject()
        .post('/api/deflections/6/release')
        .headers(custodyUserHeaders)
        .payload({
          releaseReasonId: 'medical_issue',
        });

      assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('returns 422 if other release misses mandatory fields', async () => {
      const response = await app.inject()
        .post('/api/deflections/6/release')
        .headers(custodyUserHeaders)
        .payload({
          releaseReasonId: 'other',
          otherReleaseReason: 'Missing destination',
        });

      assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('returns 409 if status is not releasable', async () => {
      await prisma.deflection.update({
        where: { id: 6 },
        data: { subjectStatus: 'EXITED' },
      });

      const response = await app.inject()
        .post('/api/deflections/6/release')
        .headers(custodyUserHeaders)
        .payload({
          releaseReasonId: 'sobered',
        });

      assert.strictEqual(response.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('returns 404 for non-existent deflection', async () => {
      const response = await app.inject()
        .post('/api/deflections/99999/release')
        .headers(custodyUserHeaders)
        .payload({
          releaseReasonId: 'sobered',
        });

      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
