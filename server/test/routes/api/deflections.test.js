import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/deflections', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const anotherUserHeaders = await authenticate(app, 'another.user@test.com', 'test');
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
      assert.deepStrictEqual(data.length, 1);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates deflection details', async () => {
      const response = await app.inject().patch('/api/deflections/4').payload({
        behavior: 'This is the narrative text.',
        deflectionDetails: ['unable_to_stand', 'confused'],
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.behavior, 'This is the narrative text.');
      assert.deepStrictEqual(data.deflectionDetails.length, 2);

      // Verify in database
      const deflection = await prisma.deflection.findUnique({
        where: { id: 4 },
        include: {
          deflectionDetails: true,
        },
      });
      assert.deepStrictEqual(deflection.behavior, 'This is the narrative text.');
      assert.deepStrictEqual(deflection.deflectionDetails.length, 2);
    });

    await t.test('returns 404 for non-existent deflection', async () => {
      const nonExistentId = '0';
      const response = await app.inject().patch(`/api/deflections/${nonExistentId}`).payload({
        behavior: 'Cooperative',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
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
      assert.deepStrictEqual(bedType.available, 4);

      const response = await app.inject().post('/api/deflections/6/admit').headers(careUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.subjectStatus, 'ADMITTED');
      assert.ok(data.admittedAt);
      assert.ok(data.admittedById);

      // Verify in database
      const deflection = await prisma.deflection.findUnique({
        where: { id: 6 },
      });
      assert.deepStrictEqual(deflection.subjectStatus, 'ADMITTED');
      assert.ok(deflection.admittedAt);
      assert.ok(deflection.admittedById);

      bedType = await prisma.bedType.findUnique({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(bedType.occupied, 1);
      assert.deepStrictEqual(bedType.holds, 3);
      assert.deepStrictEqual(bedType.available, 4);
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
    });
  });

  await t.test('DELETE /:id', async (t) => {
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
      assert.deepStrictEqual(bedType.available, 5);

      response = await app.inject().delete('/api/deflections/5?cancelReasonId=5150').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      bedType = await prisma.bedType.findUnique({
        where: { id: deflection.bedTypeId },
      });
      assert.deepStrictEqual(bedType.holds, 2);
      assert.deepStrictEqual(bedType.available, 6);

      response = await app.inject().delete('/api/deflections/6?cancelReasonId=5150').headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      bedType = await prisma.bedType.findUnique({
        where: { id: deflection.bedTypeId },
      });
      assert.deepStrictEqual(bedType.holds, 1);
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
});
