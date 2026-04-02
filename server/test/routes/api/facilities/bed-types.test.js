import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/facilities/:facilityId/bed-types', async (t) => {
  const app = await build(t);
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Helper to get a facility ID
  const facility = await app.prisma.facility.findFirst();
  assert.ok(facility, 'No facility found in database');
  const facilityId = facility.id;

  // Helper to get an unavailable reason
  const getReasonId = async () => {
    const reason = await app.prisma.bedTypeUnavailableReason.findFirst();
    return reason.id;
  };

  await t.test('GET /:id', async (t) => {
    await t.test('returns bed type details', async () => {
      const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';
      const response = await app.inject()
        .get(`/api/facilities/${facilityId}/bed-types/${bedTypeId}`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, bedTypeId);
    });

    await t.test('returns 404 for non-existent bed type', async () => {
      const response = await app.inject()
        .get(`/api/facilities/${facilityId}/bed-types/00000000-0000-0000-0000-000000000000`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates bed type and creates bed type update', async () => {
      // fixtures contain one expired deflection, this will create 1 update record
      await app.prisma.deflection.expire();

      const updateData = {
        capacity: 25,
        unavailableUnoccupied: 0,
        unavailableOccupied: 0,
        updateNotes: 'Increased capacity',
      };

      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(adminHeaders)
        .payload(updateData);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const updatedBedType = JSON.parse(response.body);

      assert.deepStrictEqual(updatedBedType.capacity, 25);
      assert.deepStrictEqual(updatedBedType.unavailableUnoccupied, 0);
      assert.deepStrictEqual(updatedBedType.unavailableOccupied, 0);
      // Check calculated available: 25 - 0 - 0 - 0 (occupied default) - 0 (holds default) = 25
      assert.deepStrictEqual(updatedBedType.available, 21);

      // Check if an additional BedTypeUpdate record was created
      const updates = await app.prisma.bedTypeUpdate.findMany({
        where: { bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        orderBy: { updatedAt: 'desc' },
      });
      assert.deepStrictEqual(updates.length, 2);
      assert.deepStrictEqual(updates[0].capacity, 25);
      assert.deepStrictEqual(updates[0].updateNotes, 'Increased capacity');
    });

    await t.test('updates occupied manually and recalculates available', async () => {
      // fixtures contain one expired deflection, this will create 1 update record
      await app.prisma.deflection.expire();

      const reasonId = await getReasonId();
      const updateData = {
        unavailableUnoccupied: 1,
        unavailableOccupied: 1,
        unavailableReasonId: reasonId,
        updateNotes: 'Updated occupied manually',
      };

      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(adminHeaders)
        .payload(updateData);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const updated = JSON.parse(response.body);

      // Capacity 10 (from create), Unavailable/Unoccupied 1, Unavailable/Occupied 1, Occupied 0, Holds 4. Available = 10 - 1 - 1 - 0 - 4 = 4.
      assert.deepStrictEqual(updated.unavailableOccupied, 1);
      assert.deepStrictEqual(updated.unavailableUnoccupied, 1);
      assert.deepStrictEqual(updated.occupied, 0);
      assert.deepStrictEqual(updated.holds, 4);
      assert.deepStrictEqual(updated.inTransit, 3);
      assert.deepStrictEqual(updated.available, 4);

      // Check history count
      const count = await app.prisma.bedTypeUpdate.count({ where: { bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' } });
      assert.deepStrictEqual(count, 2);
    });

    await t.test('updates with unavailable reason and other text', async () => {
      await app.prisma.deflection.expire();

      const reason = await app.prisma.bedTypeUnavailableReason.findFirst({
        where: { description: 'Lack of SFSD staffing' },
      });
      assert.ok(reason, 'Unavailable reason fixture not found');

      const updateData = {
        unavailableUnoccupied: 3,
        unavailableReasonId: reason.id,
        unavailableOther: 'Short staffed today',
      };

      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(adminHeaders)
        .payload(updateData);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const updated = JSON.parse(response.body);
      assert.deepStrictEqual(updated.unavailableUnoccupied, 3);
      assert.deepStrictEqual(updated.unavailableReasonId, reason.id);
      assert.deepStrictEqual(updated.unavailableOther, 'Short staffed today');

      // Check audit record has the reason fields
      const latestUpdate = await app.prisma.bedTypeUpdate.findFirst({
        where: { bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        orderBy: { updatedAt: 'desc' },
      });
      assert.deepStrictEqual(latestUpdate.unavailableReasonId, reason.id);
      assert.deepStrictEqual(latestUpdate.unavailableOther, 'Short staffed today');
    });

    await t.test('clears unavailable reason when unavailableUnoccupied is 0', async () => {
      await app.prisma.deflection.expire();

      const reasonId = await getReasonId();

      // First set a reason
      await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(adminHeaders)
        .payload({
          unavailableUnoccupied: 2,
          unavailableReasonId: reasonId,
          unavailableOther: 'Testing',
        });

      // Then set unavailable to 0
      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(adminHeaders)
        .payload({ unavailableUnoccupied: 0 });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const updated = JSON.parse(response.body);
      assert.deepStrictEqual(updated.unavailableUnoccupied, 0);
      assert.deepStrictEqual(updated.unavailableReasonId, null);
      assert.deepStrictEqual(updated.unavailableOther, null);
    });

    await t.test('requires reason when unavailableUnoccupied > 0', async () => {
      await app.prisma.deflection.expire();

      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(adminHeaders)
        .payload({ unavailableUnoccupied: 3 });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      const body = JSON.parse(response.body);
      assert.deepStrictEqual(body.errors[0].path, 'unavailableReasonId');
    });

    await t.test('rejects invalid unavailableReasonId', async () => {
      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(adminHeaders)
        .payload({
          unavailableUnoccupied: 1,
          unavailableReasonId: '00000000-0000-0000-0000-000000000000',
        });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      const body = JSON.parse(response.body);
      assert.deepStrictEqual(body.errors[0].path, 'unavailableReasonId');
    });

    await t.test('returns 404 if bed type not found', async () => {
      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/00000000-0000-0000-0000-000000000000`)
        .headers(adminHeaders)
        .payload({ capacity: 10 });

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
