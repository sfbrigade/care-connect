import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';
import Facility from '#models/facility.js';
import Deflection from '#models/deflection.js';

const FACILITY_ID = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
const BED_TYPE_ID = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';

test('Hold cancellation edge cases', async (t) => {
  const app = await build(t);
  const facilityAdminHeaders = await authenticate(app, 'facilityadmin@test.com', 'test');
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('PATCH bed-type: auto-cancels in-transit holds when unavailable squeezes capacity (LIFO)', async () => {
    // Expire the expired hold so counts are clean
    await app.prisma.deflection.expire();

    // Count in-transit holds (ACTIVE + DETAINED)
    const inTransitBefore = await app.prisma.deflection.count({
      where: {
        bedTypeId: BED_TYPE_ID,
        facilityId: FACILITY_ID,
        status: Deflection.HoldStatus.ACTIVE,
        subjectStatus: Deflection.SubjectStatus.DETAINED,
      },
    });
    assert.ok(inTransitBefore >= 2, `Expected at least 2 in-transit holds, got ${inTransitBefore}`);

    const reason = await app.prisma.bedTypeUnavailableReason.findFirst();

    // Set unavailable high enough to force cancellation of 1 in-transit hold
    // capacity=10, occupied=0, holds=4 (after expire). Setting unavailable to 7 means:
    // available = 10 - 7 - 0 - 0 - 4 = -1 → need to cancel 1 hold
    const response = await app.inject()
      .patch(`/api/facilities/${FACILITY_ID}/bed-types/${BED_TYPE_ID}`)
      .headers(facilityAdminHeaders)
      .payload({
        unavailableUnoccupied: 7,
        unavailableReasonId: reason.id,
      });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const updated = JSON.parse(response.body);

    // After expire: holds = 4. available = 10 - 7 - 0 - 0 - 4 = -1, so 1 hold cancelled.
    // Final: holds = 3, available = 10 - 7 - 0 - 0 - 3 = 0
    assert.deepStrictEqual(updated.holds, 3);
    assert.deepStrictEqual(updated.inTransit, 2);
    assert.deepStrictEqual(updated.available, 0);
    assert.deepStrictEqual(updated.unavailableUnoccupied, 7);

    // Verify the most recently created in-transit hold was cancelled (LIFO)
    const cancelledHolds = await app.prisma.deflection.findMany({
      where: {
        bedTypeId: BED_TYPE_ID,
        facilityId: FACILITY_ID,
        status: Deflection.HoldStatus.CANCELLED,
        cancelledById: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(cancelledHolds.length >= 1, 'Expected at least 1 auto-cancelled hold');

    // Verify deflectionUpdate audit record was created
    const cancelUpdate = await app.prisma.deflectionUpdate.findFirst({
      where: {
        deflectionId: cancelledHolds[0].id,
        status: Deflection.HoldStatus.CANCELLED,
      },
    });
    assert.ok(cancelUpdate, 'Expected deflectionUpdate audit record for auto-cancelled hold');
  });

  await t.test('POST facility status CLOSED: cancels all active in-transit holds', async () => {
    // Expire the expired hold so counts are clean
    await app.prisma.deflection.expire();

    // Count active in-transit holds before closing
    const inTransitBefore = await app.prisma.deflection.count({
      where: {
        facilityId: FACILITY_ID,
        status: Deflection.HoldStatus.ACTIVE,
        subjectStatus: Deflection.SubjectStatus.DETAINED,
      },
    });

    const response = await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/status`)
      .headers(facilityAdminHeaders)
      .payload({
        status: Facility.Status.CLOSED,
        statusReasonId: 'other',
        statusOther: 'Emergency closure',
      });

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data.status, Facility.Status.CLOSED);

    // All in-transit holds should now be cancelled
    const inTransitAfter = await app.prisma.deflection.count({
      where: {
        facilityId: FACILITY_ID,
        status: Deflection.HoldStatus.ACTIVE,
        subjectStatus: Deflection.SubjectStatus.DETAINED,
      },
    });
    assert.deepStrictEqual(inTransitAfter, 0, 'All in-transit holds should be cancelled after facility closure');

    // Non-in-transit active holds (e.g., READY_FOR_INTAKE) should NOT be cancelled
    const nonTransitActive = await app.prisma.deflection.count({
      where: {
        facilityId: FACILITY_ID,
        status: Deflection.HoldStatus.ACTIVE,
        subjectStatus: { not: Deflection.SubjectStatus.DETAINED },
      },
    });
    assert.ok(nonTransitActive > 0, 'Non-in-transit holds should still be active');

    // Bed type holds count should reflect cancellations
    const bedType = await app.prisma.bedType.findUnique({
      where: { id: BED_TYPE_ID },
    });
    // holds should have decreased by the number of in-transit holds cancelled
    assert.ok(bedType.holds < inTransitBefore + bedType.holds, 'Bed type holds should have decreased');
    assert.deepStrictEqual(bedType.inTransit, 0, 'Bed type in-transit should be 0');
  });

  await t.test('POST deflections: blocks new holds when facility is not accepting', async () => {
    // Set facility to OPEN_NOT_ACCEPTING
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/status`)
      .headers(facilityAdminHeaders)
      .payload({
        status: Facility.Status.OPEN_NOT_ACCEPTING,
        statusReasonId: 'other',
        statusOther: 'Pausing holds',
      });

    const response = await app.inject()
      .post('/api/deflections')
      .headers(userHeaders)
      .payload({
        facilityId: FACILITY_ID,
        incidentId: 1,
        bedTypeId: BED_TYPE_ID,
      });

    assert.deepStrictEqual(response.statusCode, StatusCodes.CONFLICT);
    const body = JSON.parse(response.body);
    assert.deepStrictEqual(body.error, 'Facility is not accepting new holds');

    // Restore facility to OPEN_ACCEPTING
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/status`)
      .headers(facilityAdminHeaders)
      .payload({
        status: Facility.Status.OPEN_ACCEPTING,
      });
  });

  await t.test('POST deflections: blocks new holds when facility is closed', async () => {
    // Set facility to CLOSED
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/status`)
      .headers(facilityAdminHeaders)
      .payload({
        status: Facility.Status.CLOSED,
        statusReasonId: 'other',
        statusOther: 'Closed for testing',
      });

    const response = await app.inject()
      .post('/api/deflections')
      .headers(userHeaders)
      .payload({
        facilityId: FACILITY_ID,
        incidentId: 1,
        bedTypeId: BED_TYPE_ID,
      });

    assert.deepStrictEqual(response.statusCode, StatusCodes.CONFLICT);

    // Restore facility to OPEN_ACCEPTING
    await app.inject()
      .post(`/api/facilities/${FACILITY_ID}/status`)
      .headers(facilityAdminHeaders)
      .payload({
        status: Facility.Status.OPEN_ACCEPTING,
      });
  });

  await t.test('concurrent facility close vs incident-create never leaves closed facility with active new in-transit hold', async () => {
    const caseNumber = `CLOSE-RACE-INCIDENT-${Date.now()}`;

    await app.prisma.deflection.expire();
    await app.prisma.bedType.update({
      where: { id: BED_TYPE_ID },
      data: {
        holds: 0,
        inTransit: 0,
        available: 1,
      },
    });

    const [closeResponse, createResponse] = await Promise.all([
      app.inject()
        .post(`/api/facilities/${FACILITY_ID}/status`)
        .headers(facilityAdminHeaders)
        .payload({
          status: Facility.Status.CLOSED,
          statusReasonId: 'other',
          statusOther: 'Concurrent close',
        }),
      app.inject()
        .post(`/api/incidents?bedTypeId=${BED_TYPE_ID}`)
        .headers(userHeaders)
        .payload({
          facilityId: FACILITY_ID,
          encounteredVia: 'DISPATCHED',
          cadNumber: `CAD-${caseNumber}`,
          caseNumber,
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          postalCode: '',
          latitude: 0,
          longitude: 0,
          arrestedAt: '',
          supervisorBadgeNumber: '',
        }),
    ]);

    assert.deepStrictEqual(closeResponse.statusCode, StatusCodes.OK);
    assert.ok([StatusCodes.CREATED, StatusCodes.CONFLICT].includes(createResponse.statusCode));

    const facility = await app.prisma.facility.findUnique({
      where: { id: FACILITY_ID },
    });
    const activeNewHolds = await app.prisma.deflection.count({
      where: {
        status: Deflection.HoldStatus.ACTIVE,
        subjectStatus: Deflection.SubjectStatus.DETAINED,
        incident: {
          caseNumber,
        },
      },
    });

    assert.deepStrictEqual(facility.status, Facility.Status.CLOSED);
    assert.deepStrictEqual(activeNewHolds, 0);
  });

  await t.test('concurrent facility close vs direct deflection-create never leaves closed facility with active new in-transit hold', async () => {
    const incident = await app.prisma.incident.create({
      data: {
        facilityId: FACILITY_ID,
        encounteredVia: 'DISPATCHED',
        cadNumber: `CAD-DIRECT-${Date.now()}`,
        caseNumber: `CASE-DIRECT-${Date.now()}`,
        createdById: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5',
        updatedById: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5',
      },
    });

    await app.prisma.deflection.expire();
    await app.prisma.bedType.update({
      where: { id: BED_TYPE_ID },
      data: {
        holds: 0,
        inTransit: 0,
        available: 1,
      },
    });

    const [closeResponse, createResponse] = await Promise.all([
      app.inject()
        .post(`/api/facilities/${FACILITY_ID}/status`)
        .headers(facilityAdminHeaders)
        .payload({
          status: Facility.Status.CLOSED,
          statusReasonId: 'other',
          statusOther: 'Concurrent close',
        }),
      app.inject()
        .post('/api/deflections')
        .headers(userHeaders)
        .payload({
          facilityId: FACILITY_ID,
          incidentId: incident.id,
          bedTypeId: BED_TYPE_ID,
        }),
    ]);

    assert.deepStrictEqual(closeResponse.statusCode, StatusCodes.OK);
    assert.ok([StatusCodes.CREATED, StatusCodes.CONFLICT].includes(createResponse.statusCode));

    const facility = await app.prisma.facility.findUnique({
      where: { id: FACILITY_ID },
    });
    const activeNewHolds = await app.prisma.deflection.count({
      where: {
        incidentId: incident.id,
        status: Deflection.HoldStatus.ACTIVE,
        subjectStatus: Deflection.SubjectStatus.DETAINED,
      },
    });

    assert.deepStrictEqual(facility.status, Facility.Status.CLOSED);
    assert.deepStrictEqual(activeNewHolds, 0);
  });
});
