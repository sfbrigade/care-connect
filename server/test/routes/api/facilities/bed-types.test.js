import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/facilities/:facilityId/bed-types', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const facilityAdminHeaders = await authenticate(app, 'facilityadmin@test.com', 'test');

  // Helper to get a facility ID
  const facility = await app.prisma.facility.findFirst();
  assert.ok(facility, 'No facility found in database');
  const facilityId = facility.id;

  const DEFAULT_UNAVAILABLE_REASON = 'SFSD_STAFFING';

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

    await t.test('returns derived inTransit count instead of stale stored value', async () => {
      await app.prisma.deflection.expire();
      await app.prisma.deflection.update({
        where: { id: 5 },
        data: { subjectStatus: 'ONSITE_AWAITING_TRANSFER' },
      });
      await app.prisma.bedType.update({
        where: { id: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        data: { inTransit: 99 },
      });

      const response = await app.inject()
        .get(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.inTransit, 2);
    });

    await t.test('returns 404 for non-existent bed type', async () => {
      const response = await app.inject()
        .get(`/api/facilities/${facilityId}/bed-types/00000000-0000-0000-0000-000000000000`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('returns 401 without authentication', async () => {
      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .payload({ capacity: 10 });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('returns 403 for non-FACILITY_ADMIN user', async () => {
      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(userHeaders)
        .payload({ capacity: 10 });

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

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
        .headers(facilityAdminHeaders)
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

      const updateData = {
        unavailableUnoccupied: 1,
        unavailableOccupied: 1,
        unavailableReason: DEFAULT_UNAVAILABLE_REASON,
        updateNotes: 'Updated occupied manually',
      };

      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(facilityAdminHeaders)
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

      const updateData = {
        unavailableUnoccupied: 3,
        unavailableReason: 'SFSD_STAFFING',
        unavailableOther: 'Short staffed today',
      };

      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(facilityAdminHeaders)
        .payload(updateData);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const updated = JSON.parse(response.body);
      assert.deepStrictEqual(updated.unavailableUnoccupied, 3);
      assert.deepStrictEqual(updated.unavailableReason, 'SFSD_STAFFING');
      assert.deepStrictEqual(updated.unavailableOther, 'Short staffed today');

      // Check audit record has the reason fields
      const latestUpdate = await app.prisma.bedTypeUpdate.findFirst({
        where: { bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76' },
        orderBy: { updatedAt: 'desc' },
      });
      assert.deepStrictEqual(latestUpdate.unavailableReason, 'SFSD_STAFFING');
      assert.deepStrictEqual(latestUpdate.unavailableOther, 'Short staffed today');
    });

    await t.test('clears unavailable reason when unavailableUnoccupied is 0', async () => {
      await app.prisma.deflection.expire();

      // First set a reason
      await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(facilityAdminHeaders)
        .payload({
          unavailableUnoccupied: 2,
          unavailableReason: DEFAULT_UNAVAILABLE_REASON,
          unavailableOther: 'Testing',
        });

      // Then set unavailable to 0
      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(facilityAdminHeaders)
        .payload({ unavailableUnoccupied: 0 });

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const updated = JSON.parse(response.body);
      assert.deepStrictEqual(updated.unavailableUnoccupied, 0);
      assert.deepStrictEqual(updated.unavailableReason, null);
      assert.deepStrictEqual(updated.unavailableOther, null);
    });

    await t.test('requires reason when unavailableUnoccupied > 0', async () => {
      await app.prisma.deflection.expire();

      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(facilityAdminHeaders)
        .payload({ unavailableUnoccupied: 3 });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      const body = JSON.parse(response.body);
      assert.deepStrictEqual(body.errors[0].path, 'unavailableReason');
    });

    await t.test('rejects invalid unavailableReason', async () => {
      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/2347510d-5fd0-4c5c-8a14-82bfd3ef2c76`)
        .headers(facilityAdminHeaders)
        .payload({
          unavailableUnoccupied: 1,
          unavailableReason: 'INVALID_REASON',
        });

      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      const body = JSON.parse(response.body);
      assert.deepStrictEqual(body.errors[0].path, 'unavailableReason');
    });

    await t.test('returns 404 if bed type not found', async () => {
      const response = await app.inject()
        .patch(`/api/facilities/${facilityId}/bed-types/00000000-0000-0000-0000-000000000000`)
        .headers(facilityAdminHeaders)
        .payload({ capacity: 10 });

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
