import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/lesc/clients', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('GET /:id', async (t) => {
    await t.test('returns a client by its id', async () => {
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

      const response = await app.inject().get(`/api/lesc/clients/${client.id}`).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, client.id);
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.dateOfBirth, '1990-01-01T00:00:00.000Z');
      assert.deepStrictEqual(data.sex, 'Male');
      assert.deepStrictEqual(data.race, 'White');
      assert.deepStrictEqual(data.personallyIdentifiable, 'Yes');
      assert.ok(data.createdAt);
      assert.ok(data.updatedAt);
    });

    await t.test('returns 404 for non-existent client', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().get(`/api/lesc/clients/${nonExistentId}`).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('returns 401 when not authenticated', async () => {
      const client = await prisma.client.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
      });

      const response = await app.inject().get(`/api/lesc/clients/${client.id}`);
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('handles client with null optional fields', async () => {
      const client = await prisma.client.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const response = await app.inject().get(`/api/lesc/clients/${client.id}`).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.dateOfBirth, null);
      assert.deepStrictEqual(data.sex, null);
      assert.deepStrictEqual(data.race, null);
      assert.deepStrictEqual(data.personallyIdentifiable, null);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates client attributes', async () => {
      const client = await prisma.client.create({
        data: {
          firstName: 'Original',
          lastName: 'Name',
        },
      });

      const response = await app.inject().patch(`/api/lesc/clients/${client.id}`).payload({
        firstName: 'Updated',
        lastName: 'Name',
        dateOfBirth: '1985-05-15',
        sex: 'Female',
        race: 'Black',
        personallyIdentifiable: 'No',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.firstName, 'Updated');
      assert.deepStrictEqual(data.lastName, 'Name');
      assert.deepStrictEqual(data.dateOfBirth, '1985-05-15T00:00:00.000Z');
      assert.deepStrictEqual(data.sex, 'Female');
      assert.deepStrictEqual(data.race, 'Black');
      assert.deepStrictEqual(data.personallyIdentifiable, 'No');

      // Verify in database
      const updatedClient = await prisma.client.findUnique({ where: { id: client.id } });
      assert.deepStrictEqual(updatedClient.firstName, 'Updated');
      assert.deepStrictEqual(updatedClient.sex, 'Female');
      assert.deepStrictEqual(updatedClient.race, 'Black');
    });

    await t.test('updates only provided fields', async () => {
      const client = await prisma.client.create({
        data: {
          firstName: 'Partial',
          lastName: 'Update',
          sex: 'Male',
        },
      });

      const response = await app.inject().patch(`/api/lesc/clients/${client.id}`).payload({
        firstName: 'Updated',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.firstName, 'Updated');
      assert.deepStrictEqual(data.lastName, 'Update'); // Unchanged
      assert.deepStrictEqual(data.sex, 'Male'); // Unchanged
    });

    await t.test('can set fields to null', async () => {
      const client = await prisma.client.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          sex: 'Male',
          race: 'White',
        },
      });

      const response = await app.inject().patch(`/api/lesc/clients/${client.id}`).payload({
        sex: null,
        race: null,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.sex, null);
      assert.deepStrictEqual(data.race, null);
    });

    await t.test('returns 404 for non-existent client', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject().patch(`/api/lesc/clients/${nonExistentId}`).payload({
        firstName: 'Test',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('returns 401 when not authenticated', async () => {
      const client = await prisma.client.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const response = await app.inject().patch(`/api/lesc/clients/${client.id}`).payload({
        firstName: 'Updated',
      });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('updates description and notes fields', async () => {
      const client = await prisma.client.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const response = await app.inject().patch(`/api/lesc/clients/${client.id}`).payload({
        description: 'Test description',
        notes: 'Test notes',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.description, 'Test description');
      assert.deepStrictEqual(data.notes, 'Test notes');
    });

    await t.test('handles dateOfBirth as empty string (sets to null)', async () => {
      const client = await prisma.client.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: new Date('1990-01-01'),
        },
      });

      const response = await app.inject().patch(`/api/lesc/clients/${client.id}`).payload({
        dateOfBirth: '',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.dateOfBirth, null);
    });
  });

  await t.test('PATCH /:id - New Fields', async (t) => {
    await t.test('updates client middleInitial, address, driverLicense, localId', async () => {
      const client = await prisma.client.create({
        data: {
          firstName: 'Original',
          lastName: 'Name',
        },
      });

      const response = await app.inject().patch(`/api/lesc/clients/${client.id}`).payload({
        middleInitial: 'B',
        address: '789 Update Ave',
        driverLicense: 'DL777666',
        localId: 'SF-456',
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.middleInitial, 'B');
      assert.deepStrictEqual(data.address, '789 Update Ave');
      assert.deepStrictEqual(data.driverLicense, 'DL777666');
      assert.deepStrictEqual(data.localId, 'SF-456');

      // Verify in database
      const updatedClient = await prisma.client.findUnique({
        where: { id: client.id },
      });
      assert.deepStrictEqual(updatedClient.middleInitial, 'B');
      assert.deepStrictEqual(updatedClient.address, '789 Update Ave');
      assert.deepStrictEqual(updatedClient.driverLicense, 'DL777666');
      assert.deepStrictEqual(updatedClient.localId, 'SF-456');
    });

    await t.test('can set new client fields to null', async () => {
      const client = await prisma.client.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          middleInitial: 'M',
          address: '123 Main St',
          driverLicense: 'DL123',
          localId: 'SF-999',
        },
      });

      const response = await app.inject().patch(`/api/lesc/clients/${client.id}`).payload({
        middleInitial: null,
        address: null,
        driverLicense: null,
        localId: null,
      }).headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);

      assert.deepStrictEqual(data.middleInitial, null);
      assert.deepStrictEqual(data.address, null);
      assert.deepStrictEqual(data.driverLicense, null);
      assert.deepStrictEqual(data.localId, null);
    });
  });
});
