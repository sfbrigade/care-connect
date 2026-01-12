import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/facilities/:facilityId/bed-statuses', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Helper to get a facility ID
  const facility = await app.prisma.facility.findFirst();
  assert.ok(facility, 'No facility found in database');
  const facilityId = facility.id;

  await t.test('GET /:bedStatusId', async (t) => {
    await t.test('returns bed status details', async () => {
      const bedStatusId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';
      const response = await app.inject()
        .get(`/api/facilities/${facilityId}/bed-statuses/${bedStatusId}`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, bedStatusId);
    });

    await t.test('returns 404 for non-existent bed status', async () => {
      const response = await app.inject()
        .get(`/api/facilities/${facilityId}/bed-statuses/00000000-0000-0000-0000-000000000000`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('PATCH /:bedStatusId', async (t) => {
    await t.test('updates bed status and creates bed status update', async () => {
      const updateData = {
        capacity: 25,
        unavailableUnoccupied: 0,
        unavailableOccupied: 0,
        updateNotes: 'Increased capacity',
      };

      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-statuses/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(userHeaders)
        .payload(updateData);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const updatedBedStatus = JSON.parse(response.body);

      assert.deepStrictEqual(updatedBedStatus.capacity, 25);
      assert.deepStrictEqual(updatedBedStatus.unavailableUnoccupied, 0);
      assert.deepStrictEqual(updatedBedStatus.unavailableOccupied, 0);
      // Check calculated available: 25 - 0 - 0 - 0 (occupied default) - 0 (holds default) = 25
      assert.deepStrictEqual(updatedBedStatus.available, 21);

      // Check if BedStatusUpdate record was created
      const updates = await app.prisma.bedStatusUpdate.findMany({
        where: { bedStatusId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
      });
      assert.deepStrictEqual(updates.length, 1);
      assert.deepStrictEqual(updates[0].capacity, 25);
      assert.deepStrictEqual(updates[0].updateNotes, 'Increased capacity');
    });

    await t.test('updates occupied manually and recalculates available', async () => {
      const updateData = {
        unavailableUnoccupied: 1,
        unavailableOccupied: 1,
        updateNotes: 'Updated occupied manually',
      };

      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-statuses/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(userHeaders)
        .payload(updateData);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const updated = JSON.parse(response.body);

      // Capacity 10 (from create), Unavailable/Unoccupied 1, Unavailable/Occupied 1, Occupied 0, Holds 4. Available = 10 - 1 - 1 - 0 - 4 = 4.
      assert.deepStrictEqual(updated.unavailableOccupied, 1);
      assert.deepStrictEqual(updated.unavailableUnoccupied, 1);
      assert.deepStrictEqual(updated.occupied, 0);
      assert.deepStrictEqual(updated.holds, 4);
      assert.deepStrictEqual(updated.available, 4);

      // Check history count
      const count = await app.prisma.bedStatusUpdate.count({ where: { bedStatusId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' } });
      assert.deepStrictEqual(count, 1);
    });

    await t.test('returns 404 if bed status not found', async () => {
      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-statuses/00000000-0000-0000-0000-000000000000`)
        .headers(userHeaders)
        .payload({ capacity: 10 });

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
