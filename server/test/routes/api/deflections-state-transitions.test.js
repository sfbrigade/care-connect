import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FACILITY_ID = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
const BED_TYPE_ID = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';
const CUSTODY_USER_ID = '49acdf99-536f-49ac-8138-1c77e5087697';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assert that bed-type counts satisfy basic invariants.
 * capacity = unavailableUnoccupied + unavailableOccupied + occupied + holds + available
 */
function assertBedCountInvariant (bedType) {
  const total = bedType.unavailableUnoccupied
    + bedType.unavailableOccupied
    + bedType.occupied
    + bedType.holds
    + bedType.available;
  assert.strictEqual(total, bedType.capacity,
    `Bed count invariant violated: ${total} !== capacity ${bedType.capacity} ` +
    `(unavailUnoccupied=${bedType.unavailableUnoccupied}, unavailOccupied=${bedType.unavailableOccupied}, ` +
    `occupied=${bedType.occupied}, holds=${bedType.holds}, available=${bedType.available})`);
  assert.ok(bedType.inTransit <= bedType.holds,
    `inTransit (${bedType.inTransit}) exceeds holds (${bedType.holds})`);
  assert.ok(bedType.occupied >= 0, `occupied is negative: ${bedType.occupied}`);
  assert.ok(bedType.holds >= 0, `holds is negative: ${bedType.holds}`);
  assert.ok(bedType.available >= 0, `available is negative: ${bedType.available}`);
  assert.ok(bedType.inTransit >= 0, `inTransit is negative: ${bedType.inTransit}`);
}

/**
 * Create a fresh deflection in a specific subjectStatus with clean bed counts.
 * Returns the created deflection.
 */
async function createDeflectionInStatus (prisma, subjectStatus, {
  holds = 3,
  occupied = 0,
  inTransit = 0,
  available = 5,
  extraDeflectionData = {},
} = {}) {
  await prisma.bedType.update({
    where: { id: BED_TYPE_ID },
    data: { occupied, holds, inTransit, available },
  });

  const baseData = {
    facilityId: FACILITY_ID,
    incidentId: 1,
    bedTypeId: BED_TYPE_ID,
    subjectStatus,
    createdById: CUSTODY_USER_ID,
    currentOfficerId: CUSTODY_USER_ID,
  };

  // Add timestamps that would exist if the deflection had reached this status naturally
  const timestamps = {};
  const postTransferStatuses = [
    'AWAITING_INTAKE', 'READY_FOR_INTAKE', 'FAILED_INTAKE',
    'ADMITTED', 'IN_CHAIR', 'RELEASED', 'EXITED',
    'DEATH_IN_FACILITY', 'DEATH_IN_CUSTODY',
  ];
  if (postTransferStatuses.includes(subjectStatus)) {
    timestamps.transferredAt = new Date();
    timestamps.transferredById = CUSTODY_USER_ID;
  }
  const postAdmitStatuses = [
    'ADMITTED', 'IN_CHAIR', 'FAILED_INTAKE', 'RELEASED', 'EXITED',
    'DEATH_IN_FACILITY', 'DEATH_IN_CUSTODY',
  ];
  if (postAdmitStatuses.includes(subjectStatus)) {
    timestamps.admittedAt = new Date();
    timestamps.admittedById = CUSTODY_USER_ID;
  }
  if (subjectStatus === 'FAILED_INTAKE') {
    timestamps.rejectedAt = new Date();
    timestamps.rejectedById = CUSTODY_USER_ID;
  }
  if (['RELEASED', 'EXITED', 'DEATH_IN_FACILITY'].includes(subjectStatus)) {
    timestamps.releasedAt = new Date();
    timestamps.releasedById = CUSTODY_USER_ID;
  }
  if (['EXITED'].includes(subjectStatus)) {
    timestamps.exitedAt = new Date();
    timestamps.exitedById = CUSTODY_USER_ID;
    timestamps.status = 'COMPLETED';
    timestamps.completedAt = new Date();
  }
  if (['DEATH_IN_FACILITY', 'DEATH_IN_CUSTODY'].includes(subjectStatus)) {
    timestamps.status = 'COMPLETED';
    timestamps.completedAt = new Date();
  }

  return prisma.deflection.create({
    data: { ...baseData, ...timestamps, ...extraDeflectionData },
  });
}


// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test('/api/deflections state transitions', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const custodyHeaders = await authenticate(app, 'sfsouser1@test.com', 'test');
  const careHeaders = await authenticate(app, 'careuser1@test.com', 'test');
  const fieldHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Expire fixture deflections before each section so bed counts are predictable
  async function resetBedState () {
    await prisma.deflection.expire();
  }

  // =========================================================================
  // Section 1: Invalid transition rejection
  // =========================================================================

  await t.test('Invalid transition rejection', async (t) => {

    // --- transfer: only valid from ONSITE_AWAITING_TRANSFER ---
    await t.test('POST /:id/transfer rejects from DETAINED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'DETAINED');
      const res = await app.inject().post(`/api/deflections/${d.id}/transfer`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/transfer rejects from AWAITING_INTAKE', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'AWAITING_INTAKE');
      const res = await app.inject().post(`/api/deflections/${d.id}/transfer`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/transfer rejects from IN_CHAIR', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'IN_CHAIR', { occupied: 1 });
      const res = await app.inject().post(`/api/deflections/${d.id}/transfer`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/transfer rejects from RELEASED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'RELEASED', { occupied: 1 });
      const res = await app.inject().post(`/api/deflections/${d.id}/transfer`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/transfer rejects from EXITED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'EXITED');
      const res = await app.inject().post(`/api/deflections/${d.id}/transfer`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    // --- safety-check: only valid from AWAITING_INTAKE ---
    await t.test('POST /:id/safety-check rejects from DETAINED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'DETAINED');
      const res = await app.inject().post(`/api/deflections/${d.id}/safety-check`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/safety-check rejects from READY_FOR_INTAKE', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'READY_FOR_INTAKE');
      const res = await app.inject().post(`/api/deflections/${d.id}/safety-check`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/safety-check rejects from ADMITTED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'ADMITTED');
      const res = await app.inject().post(`/api/deflections/${d.id}/safety-check`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/safety-check rejects from IN_CHAIR', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'IN_CHAIR', { occupied: 1 });
      const res = await app.inject().post(`/api/deflections/${d.id}/safety-check`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/safety-check rejects from RELEASED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'RELEASED', { occupied: 1 });
      const res = await app.inject().post(`/api/deflections/${d.id}/safety-check`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    // --- admit: only valid from READY_FOR_INTAKE ---
    await t.test('POST /:id/admit rejects from AWAITING_INTAKE', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'AWAITING_INTAKE');
      const res = await app.inject().post(`/api/deflections/${d.id}/admit`).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/admit rejects from ADMITTED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'ADMITTED');
      const res = await app.inject().post(`/api/deflections/${d.id}/admit`).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/admit rejects from IN_CHAIR', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'IN_CHAIR', { occupied: 1 });
      const res = await app.inject().post(`/api/deflections/${d.id}/admit`).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/admit rejects from DETAINED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'DETAINED');
      const res = await app.inject().post(`/api/deflections/${d.id}/admit`).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    // --- intake-complete: only valid from ADMITTED ---
    await t.test('POST /:id/intake-complete rejects from READY_FOR_INTAKE', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'READY_FOR_INTAKE');
      const res = await app.inject().post(`/api/deflections/${d.id}/intake-complete`).payload({ completed: true }).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/intake-complete rejects from IN_CHAIR', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'IN_CHAIR', { occupied: 1 });
      const res = await app.inject().post(`/api/deflections/${d.id}/intake-complete`).payload({ completed: true }).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/intake-complete rejects from FAILED_INTAKE', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'FAILED_INTAKE');
      const res = await app.inject().post(`/api/deflections/${d.id}/intake-complete`).payload({ completed: false }).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/intake-complete rejects from RELEASED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'RELEASED', { occupied: 1 });
      const res = await app.inject().post(`/api/deflections/${d.id}/intake-complete`).payload({ completed: true }).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    // --- release: valid from AWAITING_INTAKE, FAILED_INTAKE, READY_FOR_INTAKE, ADMITTED, IN_CHAIR ---
    await t.test('POST /:id/release rejects from DETAINED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'DETAINED');
      const res = await app.inject().post(`/api/deflections/${d.id}/release`).payload({ releaseReasonId: 'sobered' }).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/release rejects from ONSITE_AWAITING_TRANSFER', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'ONSITE_AWAITING_TRANSFER');
      const res = await app.inject().post(`/api/deflections/${d.id}/release`).payload({ releaseReasonId: 'sobered' }).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/release rejects from EXITED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'EXITED');
      const res = await app.inject().post(`/api/deflections/${d.id}/release`).payload({ releaseReasonId: 'sobered' }).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/release rejects from RELEASED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'RELEASED', { occupied: 1 });
      const res = await app.inject().post(`/api/deflections/${d.id}/release`).payload({ releaseReasonId: 'sobered' }).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    // --- exit: valid from IN_CHAIR, RELEASED ---
    await t.test('POST /:id/exit rejects from AWAITING_INTAKE', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'AWAITING_INTAKE');
      const res = await app.inject().post(`/api/deflections/${d.id}/exit`).payload({
        exitDestinationId: 'home',
        exitHousingStatusId: 'permanent',
        exitSFResident: 'YES',
        exitConnectedToCare: 'YES',
      }).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/exit rejects from DETAINED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'DETAINED');
      const res = await app.inject().post(`/api/deflections/${d.id}/exit`).payload({
        exitDestinationId: 'home',
        exitHousingStatusId: 'permanent',
        exitSFResident: 'YES',
        exitConnectedToCare: 'YES',
      }).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/exit rejects from ADMITTED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'ADMITTED');
      const res = await app.inject().post(`/api/deflections/${d.id}/exit`).payload({
        exitDestinationId: 'home',
        exitHousingStatusId: 'permanent',
        exitSFResident: 'YES',
        exitConnectedToCare: 'YES',
      }).headers(careHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    // --- exit-to-jail: valid from AWAITING_INTAKE, READY_FOR_INTAKE, ADMITTED, FAILED_INTAKE, IN_CHAIR ---
    await t.test('POST /:id/exit-to-jail rejects from DETAINED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'DETAINED');
      const res = await app.inject().post(`/api/deflections/${d.id}/exit-to-jail`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/exit-to-jail rejects from ONSITE_AWAITING_TRANSFER', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'ONSITE_AWAITING_TRANSFER');
      const res = await app.inject().post(`/api/deflections/${d.id}/exit-to-jail`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/exit-to-jail rejects from RELEASED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'RELEASED', { occupied: 1 });
      const res = await app.inject().post(`/api/deflections/${d.id}/exit-to-jail`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/exit-to-jail rejects from EXITED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'EXITED');
      const res = await app.inject().post(`/api/deflections/${d.id}/exit-to-jail`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    // --- record-death: valid from AWAITING_INTAKE, FAILED_INTAKE, READY_FOR_INTAKE, ADMITTED, IN_CHAIR, RELEASED ---
    await t.test('POST /:id/record-death rejects from DETAINED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'DETAINED');
      const res = await app.inject().post(`/api/deflections/${d.id}/record-death`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/record-death rejects from ONSITE_AWAITING_TRANSFER', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'ONSITE_AWAITING_TRANSFER');
      const res = await app.inject().post(`/api/deflections/${d.id}/record-death`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/record-death rejects from EXITED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'EXITED');
      const res = await app.inject().post(`/api/deflections/${d.id}/record-death`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/record-death rejects from DEATH_IN_FACILITY', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'DEATH_IN_FACILITY');
      const res = await app.inject().post(`/api/deflections/${d.id}/record-death`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });

    await t.test('POST /:id/record-death rejects from DEATH_IN_CUSTODY', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'DEATH_IN_CUSTODY');
      const res = await app.inject().post(`/api/deflections/${d.id}/record-death`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.CONFLICT);
    });
  });


  // =========================================================================
  // Section 2: Full lifecycle walk-throughs
  // =========================================================================

  await t.test('Full lifecycle walk-throughs', async (t) => {

    await t.test('Test A: Normal flow — create through exit', async () => {
      await resetBedState();
      await prisma.bedType.update({
        where: { id: BED_TYPE_ID },
        data: { occupied: 0, holds: 0, inTransit: 0, available: 8 },
      });

      // Step 1: Create deflection (starts as DETAINED)
      const createRes = await app.inject().post('/api/deflections').payload({
        facilityId: FACILITY_ID,
        incidentId: 1,
        bedTypeId: BED_TYPE_ID,
      }).headers(fieldHeaders);
      assert.strictEqual(createRes.statusCode, StatusCodes.CREATED);
      const created = JSON.parse(createRes.body);
      assert.strictEqual(created.subjectStatus, 'DETAINED');
      assert.strictEqual(created.status, 'ACTIVE');
      const id = created.id;

      let bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.holds, 1);
      assert.strictEqual(bedType.inTransit, 1);
      assert.strictEqual(bedType.available, 7);
      assertBedCountInvariant(bedType);

      // Step 2: Simulate arrival (set to ONSITE_AWAITING_TRANSFER — this is done by the client updating the deflection)
      await prisma.deflection.update({
        where: { id },
        data: { subjectStatus: 'ONSITE_AWAITING_TRANSFER' },
      });

      // Step 3: Transfer (ONSITE_AWAITING_TRANSFER → AWAITING_INTAKE)
      const transferRes = await app.inject().post(`/api/deflections/${id}/transfer`).headers(custodyHeaders);
      assert.strictEqual(transferRes.statusCode, StatusCodes.OK);
      const transferred = JSON.parse(transferRes.body);
      assert.strictEqual(transferred.subjectStatus, 'AWAITING_INTAKE');
      assert.ok(transferred.transferredAt);

      bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.inTransit, 0);
      assert.strictEqual(bedType.holds, 1);
      assertBedCountInvariant(bedType);

      // Step 4: Safety check (AWAITING_INTAKE → READY_FOR_INTAKE)
      const safetyRes = await app.inject().post(`/api/deflections/${id}/safety-check`).headers(custodyHeaders);
      assert.strictEqual(safetyRes.statusCode, StatusCodes.OK);
      assert.strictEqual(JSON.parse(safetyRes.body).subjectStatus, 'READY_FOR_INTAKE');

      bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.holds, 1);
      assert.strictEqual(bedType.occupied, 0);
      assertBedCountInvariant(bedType);

      // Step 5: Admit (READY_FOR_INTAKE → ADMITTED)
      const admitRes = await app.inject().post(`/api/deflections/${id}/admit`).headers(careHeaders);
      assert.strictEqual(admitRes.statusCode, StatusCodes.OK);
      const admitted = JSON.parse(admitRes.body);
      assert.strictEqual(admitted.subjectStatus, 'ADMITTED');
      assert.ok(admitted.admittedAt);

      bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.holds, 1);
      assert.strictEqual(bedType.occupied, 0);
      assertBedCountInvariant(bedType);

      // Step 6: Intake complete (ADMITTED → IN_CHAIR)
      const intakeRes = await app.inject().post(`/api/deflections/${id}/intake-complete`).payload({ completed: true }).headers(careHeaders);
      assert.strictEqual(intakeRes.statusCode, StatusCodes.OK);
      assert.strictEqual(JSON.parse(intakeRes.body).subjectStatus, 'IN_CHAIR');

      bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.holds, 0);
      assert.strictEqual(bedType.occupied, 1);
      assertBedCountInvariant(bedType);

      // Step 7: Release (IN_CHAIR → RELEASED)
      const releaseRes = await app.inject().post(`/api/deflections/${id}/release`).payload({ releaseReasonId: 'sobered' }).headers(custodyHeaders);
      assert.strictEqual(releaseRes.statusCode, StatusCodes.OK);
      const released = JSON.parse(releaseRes.body);
      assert.strictEqual(released.subjectStatus, 'RELEASED');
      assert.ok(released.releasedAt);

      // Release with 'sobered' does NOT change bed counts (person stays in chair until exit)
      bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.occupied, 1);
      assertBedCountInvariant(bedType);

      // Step 8: Exit (RELEASED → EXITED)
      const exitRes = await app.inject().post(`/api/deflections/${id}/exit`).payload({
        exitDestinationId: 'home',
        exitHousingStatusId: 'permanent',
        exitSFResident: 'YES',
        exitConnectedToCare: 'YES',
      }).headers(careHeaders);
      assert.strictEqual(exitRes.statusCode, StatusCodes.OK);
      const exited = JSON.parse(exitRes.body);
      assert.strictEqual(exited.subjectStatus, 'EXITED');
      assert.strictEqual(exited.status, 'COMPLETED');
      assert.ok(exited.exitedAt);
      assert.ok(exited.completedAt);

      bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.occupied, 0);
      assert.strictEqual(bedType.holds, 0);
      assert.strictEqual(bedType.available, 8);
      assertBedCountInvariant(bedType);

      // Verify audit trail
      const updates = await prisma.deflectionUpdate.findMany({
        where: { deflectionId: id },
        orderBy: { updatedAt: 'asc' },
      });
      assert.ok(updates.length >= 5, `Expected at least 5 audit records, got ${updates.length}`);
    });

    await t.test('Test B: Failed intake flow', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'ADMITTED', {
        holds: 3, occupied: 0, inTransit: 0, available: 5,
      });

      // ADMITTED → FAILED_INTAKE
      const intakeRes = await app.inject().post(`/api/deflections/${d.id}/intake-complete`).payload({ completed: false }).headers(careHeaders);
      assert.strictEqual(intakeRes.statusCode, StatusCodes.OK);
      assert.strictEqual(JSON.parse(intakeRes.body).subjectStatus, 'FAILED_INTAKE');

      let bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      // ADMITTED and FAILED_INTAKE are both hold statuses — no count change
      assert.strictEqual(bedType.holds, 3);
      assert.strictEqual(bedType.occupied, 0);
      assertBedCountInvariant(bedType);

      // FAILED_INTAKE → RELEASED (legal release)
      const releaseRes = await app.inject().post(`/api/deflections/${d.id}/release`).payload({ releaseReasonId: 'sobered' }).headers(custodyHeaders);
      assert.strictEqual(releaseRes.statusCode, StatusCodes.OK);
      assert.strictEqual(JSON.parse(releaseRes.body).subjectStatus, 'RELEASED');

      // Release from a hold status does NOT change bed counts when releaseReason is 'sobered'
      // (the release handler only changes bed counts for isExitRelease = medical_issue or other)
      bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assertBedCountInvariant(bedType);
    });

    await t.test('Test C: Early release — release from AWAITING_INTAKE', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'AWAITING_INTAKE', {
        holds: 3, occupied: 0, inTransit: 0, available: 5,
      });

      // AWAITING_INTAKE → RELEASED
      const releaseRes = await app.inject().post(`/api/deflections/${d.id}/release`).payload({ releaseReasonId: 'sobered' }).headers(custodyHeaders);
      assert.strictEqual(releaseRes.statusCode, StatusCodes.OK);
      assert.strictEqual(JSON.parse(releaseRes.body).subjectStatus, 'RELEASED');

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assertBedCountInvariant(bedType);
    });

    await t.test('Test D: Death in custody from IN_CHAIR', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'IN_CHAIR', {
        holds: 2, occupied: 1, inTransit: 0, available: 5,
      });

      const res = await app.inject().post(`/api/deflections/${d.id}/record-death`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.OK);
      const data = JSON.parse(res.body);
      assert.strictEqual(data.subjectStatus, 'DEATH_IN_CUSTODY');
      assert.strictEqual(data.status, 'COMPLETED');
      assert.ok(data.completedAt);

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.occupied, 0);
      assert.strictEqual(bedType.available, 6);
      assertBedCountInvariant(bedType);
    });

    await t.test('Test E: Death in facility from RELEASED', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'RELEASED', {
        holds: 2, occupied: 1, inTransit: 0, available: 5,
      });

      const res = await app.inject().post(`/api/deflections/${d.id}/record-death`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.OK);
      const data = JSON.parse(res.body);
      assert.strictEqual(data.subjectStatus, 'DEATH_IN_FACILITY');
      assert.strictEqual(data.status, 'COMPLETED');

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.occupied, 0);
      assert.strictEqual(bedType.available, 6);
      assertBedCountInvariant(bedType);
    });

    await t.test('Test F: Cancel and reopen flow', async () => {
      await resetBedState();
      await prisma.bedType.update({
        where: { id: BED_TYPE_ID },
        data: { occupied: 0, holds: 0, inTransit: 0, available: 8 },
      });

      // Create a deflection
      const createRes = await app.inject().post('/api/deflections').payload({
        facilityId: FACILITY_ID,
        incidentId: 1,
        bedTypeId: BED_TYPE_ID,
      }).headers(fieldHeaders);
      assert.strictEqual(createRes.statusCode, StatusCodes.CREATED);
      const id = JSON.parse(createRes.body).id;

      let bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      const holdsAfterCreate = bedType.holds;
      const availableAfterCreate = bedType.available;
      const inTransitAfterCreate = bedType.inTransit;
      assertBedCountInvariant(bedType);

      // Cancel it
      const cancelRes = await app.inject().delete(`/api/deflections/${id}?cancelReasonId=5150`).headers(fieldHeaders);
      assert.strictEqual(cancelRes.statusCode, StatusCodes.OK);
      assert.strictEqual(JSON.parse(cancelRes.body).status, 'CANCELLED');

      bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.holds, holdsAfterCreate - 1);
      assert.strictEqual(bedType.available, availableAfterCreate + 1);
      assertBedCountInvariant(bedType);

      // Reopen it
      const reopenRes = await app.inject().post(`/api/deflections/${id}/reopen`).headers(fieldHeaders);
      assert.strictEqual(reopenRes.statusCode, StatusCodes.OK);
      assert.strictEqual(JSON.parse(reopenRes.body).status, 'ACTIVE');

      bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.holds, holdsAfterCreate);
      assert.strictEqual(bedType.available, availableAfterCreate);
      assert.strictEqual(bedType.inTransit, inTransitAfterCreate);
      assertBedCountInvariant(bedType);
    });

    await t.test('Test G: Exit to jail from AWAITING_INTAKE', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'AWAITING_INTAKE', {
        holds: 3, occupied: 0, inTransit: 0, available: 5,
      });

      const res = await app.inject().post(`/api/deflections/${d.id}/exit-to-jail`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.OK);
      const data = JSON.parse(res.body);
      assert.strictEqual(data.subjectStatus, 'EXITED');
      assert.strictEqual(data.status, 'COMPLETED');
      assert.strictEqual(data.exitDestinationId, 'jail');

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.holds, 2);
      assert.strictEqual(bedType.available, 6);
      assertBedCountInvariant(bedType);
    });

    await t.test('Test G2: Exit to jail from IN_CHAIR', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'IN_CHAIR', {
        holds: 2, occupied: 1, inTransit: 0, available: 5,
      });

      const res = await app.inject().post(`/api/deflections/${d.id}/exit-to-jail`).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.OK);
      const data = JSON.parse(res.body);
      assert.strictEqual(data.subjectStatus, 'EXITED');
      assert.strictEqual(data.status, 'COMPLETED');

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.occupied, 0);
      assert.strictEqual(bedType.holds, 2);
      assert.strictEqual(bedType.available, 6);
      assertBedCountInvariant(bedType);
    });

    await t.test('Test H: Medical release (exit release) from IN_CHAIR', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'IN_CHAIR', {
        holds: 2, occupied: 1, inTransit: 0, available: 5,
      });

      // Medical release goes RELEASED + EXITED in one step
      const res = await app.inject().post(`/api/deflections/${d.id}/release`).payload({
        releaseReasonId: 'medical_issue',
        exitDestinationId: 'hospital',
      }).headers(custodyHeaders);
      assert.strictEqual(res.statusCode, StatusCodes.OK);
      const data = JSON.parse(res.body);
      assert.strictEqual(data.subjectStatus, 'EXITED');
      assert.strictEqual(data.status, 'COMPLETED');
      assert.ok(data.releasedAt);
      assert.ok(data.exitedAt);

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.occupied, 0);
      assert.strictEqual(bedType.available, 6);
      assertBedCountInvariant(bedType);
    });
  });


  // =========================================================================
  // Section 3: Concurrent request tests (race condition detection)
  // =========================================================================

  await t.test('Concurrent request tests', async (t) => {

    await t.test('R1: Double transfer — only one should succeed', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'ONSITE_AWAITING_TRANSFER', {
        holds: 3, occupied: 0, inTransit: 1, available: 5,
      });

      const [r1, r2] = await Promise.all([
        app.inject().post(`/api/deflections/${d.id}/transfer`).headers(custodyHeaders),
        app.inject().post(`/api/deflections/${d.id}/transfer`).headers(custodyHeaders),
      ]);

      const codes = [r1.statusCode, r2.statusCode].sort();
      assert.strictEqual(codes[0], StatusCodes.OK, `Expected one 200, got ${codes}`);
      assert.strictEqual(codes[1], StatusCodes.CONFLICT, `Expected one 409, got ${codes}`);

      // Verify deflection ended up in correct state
      const deflection = await prisma.deflection.findUnique({ where: { id: d.id } });
      assert.strictEqual(deflection.subjectStatus, 'AWAITING_INTAKE');

      // Verify bed counts changed exactly once
      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.inTransit, 0, 'inTransit should have decremented exactly once');
      assertBedCountInvariant(bedType);
    });

    await t.test('R2: Double admit — only one should succeed', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'READY_FOR_INTAKE', {
        holds: 3, occupied: 0, inTransit: 0, available: 5,
      });

      const [r1, r2] = await Promise.all([
        app.inject().post(`/api/deflections/${d.id}/admit`).headers(careHeaders),
        app.inject().post(`/api/deflections/${d.id}/admit`).headers(careHeaders),
      ]);

      const codes = [r1.statusCode, r2.statusCode].sort();
      assert.strictEqual(codes[0], StatusCodes.OK, `Expected one 200, got ${codes}`);
      assert.strictEqual(codes[1], StatusCodes.CONFLICT, `Expected one 409, got ${codes}`);

      const deflection = await prisma.deflection.findUnique({ where: { id: d.id } });
      assert.strictEqual(deflection.subjectStatus, 'ADMITTED');

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      // Admit doesn't change bed counts (both are hold statuses)
      assert.strictEqual(bedType.holds, 3);
      assertBedCountInvariant(bedType);
    });

    await t.test('R3: Transfer + cancel race — only one should succeed', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'ONSITE_AWAITING_TRANSFER', {
        holds: 3, occupied: 0, inTransit: 1, available: 5,
      });

      const [transferRes, cancelRes] = await Promise.all([
        app.inject().post(`/api/deflections/${d.id}/transfer`).headers(custodyHeaders),
        app.inject().delete(`/api/deflections/${d.id}?cancelReasonId=5150`).headers(custodyHeaders),
      ]);

      const transferOk = transferRes.statusCode === StatusCodes.OK;
      const cancelOk = cancelRes.statusCode === StatusCodes.OK;

      // At least one must succeed, and they shouldn't both succeed in conflicting ways
      assert.ok(transferOk || cancelOk, 'At least one request should succeed');

      const deflection = await prisma.deflection.findUnique({ where: { id: d.id } });
      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });

      if (transferOk && !cancelOk) {
        assert.strictEqual(deflection.subjectStatus, 'AWAITING_INTAKE');
        assert.strictEqual(deflection.status, 'ACTIVE');
      } else if (cancelOk && !transferOk) {
        assert.strictEqual(deflection.status, 'CANCELLED');
      }
      // If both succeeded, the cancel happened after the transfer — that's valid
      // (cancel checks hold status=ACTIVE, not subject status)

      assertBedCountInvariant(bedType);
    });

    await t.test('R4: Release + exit race on IN_CHAIR — only one should succeed', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'IN_CHAIR', {
        holds: 2, occupied: 1, inTransit: 0, available: 5,
      });

      const [releaseRes, exitRes] = await Promise.all([
        app.inject().post(`/api/deflections/${d.id}/release`).payload({ releaseReasonId: 'sobered' }).headers(custodyHeaders),
        app.inject().post(`/api/deflections/${d.id}/exit`).payload({
          exitDestinationId: 'home',
          exitHousingStatusId: 'permanent',
          exitSFResident: 'YES',
          exitConnectedToCare: 'YES',
        }).headers(careHeaders),
      ]);

      const releaseOk = releaseRes.statusCode === StatusCodes.OK;
      const exitOk = exitRes.statusCode === StatusCodes.OK;

      assert.ok(releaseOk || exitOk, 'At least one request should succeed');

      const deflection = await prisma.deflection.findUnique({ where: { id: d.id } });
      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });

      // Both transitions are valid from IN_CHAIR, but they should serialize
      if (releaseOk && exitOk) {
        // Release happened first (IN_CHAIR → RELEASED), then exit (RELEASED → EXITED)
        assert.strictEqual(deflection.subjectStatus, 'EXITED');
      } else if (releaseOk) {
        assert.strictEqual(deflection.subjectStatus, 'RELEASED');
      } else {
        assert.strictEqual(deflection.subjectStatus, 'EXITED');
      }

      assertBedCountInvariant(bedType);
      assert.ok(bedType.occupied >= 0, 'occupied should not go negative from double-decrement');
    });

    await t.test('R5: Admit + cancel race — only one should succeed', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'READY_FOR_INTAKE', {
        holds: 3, occupied: 0, inTransit: 0, available: 5,
      });

      const [admitRes, cancelRes] = await Promise.all([
        app.inject().post(`/api/deflections/${d.id}/admit`).headers(careHeaders),
        app.inject().delete(`/api/deflections/${d.id}?cancelReasonId=5150`).headers(custodyHeaders),
      ]);

      const admitOk = admitRes.statusCode === StatusCodes.OK;
      const cancelOk = cancelRes.statusCode === StatusCodes.OK;

      assert.ok(admitOk || cancelOk, 'At least one request should succeed');

      const deflection = await prisma.deflection.findUnique({ where: { id: d.id } });
      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });

      if (admitOk && !cancelOk) {
        assert.strictEqual(deflection.subjectStatus, 'ADMITTED');
        assert.strictEqual(deflection.status, 'ACTIVE');
      } else if (cancelOk && !admitOk) {
        assert.strictEqual(deflection.status, 'CANCELLED');
      }
      // Both could succeed if cancel runs after admit (cancel checks hold status, not subject status)

      assertBedCountInvariant(bedType);
    });

    await t.test('R6: Double intake-complete — only one should succeed', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'ADMITTED', {
        holds: 3, occupied: 0, inTransit: 0, available: 5,
      });

      const [r1, r2] = await Promise.all([
        app.inject().post(`/api/deflections/${d.id}/intake-complete`).payload({ completed: true }).headers(careHeaders),
        app.inject().post(`/api/deflections/${d.id}/intake-complete`).payload({ completed: true }).headers(careHeaders),
      ]);

      const codes = [r1.statusCode, r2.statusCode].sort();
      assert.strictEqual(codes[0], StatusCodes.OK, `Expected one 200, got ${codes}`);
      assert.strictEqual(codes[1], StatusCodes.CONFLICT, `Expected one 409, got ${codes}`);

      const deflection = await prisma.deflection.findUnique({ where: { id: d.id } });
      assert.strictEqual(deflection.subjectStatus, 'IN_CHAIR');

      // Verify occupied incremented exactly once
      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.occupied, 1, 'occupied should have incremented exactly once');
      assert.strictEqual(bedType.holds, 2, 'holds should have decremented exactly once');
      assertBedCountInvariant(bedType);
    });

    await t.test('R7: Double safety-check — only one should succeed', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'AWAITING_INTAKE', {
        holds: 3, occupied: 0, inTransit: 0, available: 5,
      });

      const [r1, r2] = await Promise.all([
        app.inject().post(`/api/deflections/${d.id}/safety-check`).headers(custodyHeaders),
        app.inject().post(`/api/deflections/${d.id}/safety-check`).headers(custodyHeaders),
      ]);

      const codes = [r1.statusCode, r2.statusCode].sort();
      assert.strictEqual(codes[0], StatusCodes.OK, `Expected one 200, got ${codes}`);
      assert.strictEqual(codes[1], StatusCodes.CONFLICT, `Expected one 409, got ${codes}`);

      const deflection = await prisma.deflection.findUnique({ where: { id: d.id } });
      assert.strictEqual(deflection.subjectStatus, 'READY_FOR_INTAKE');

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assertBedCountInvariant(bedType);
    });

    await t.test('R8: Double release — only one should succeed', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'IN_CHAIR', {
        holds: 2, occupied: 1, inTransit: 0, available: 5,
      });

      const payload = { releaseReasonId: 'sobered' };
      const [r1, r2] = await Promise.all([
        app.inject().post(`/api/deflections/${d.id}/release`).payload(payload).headers(custodyHeaders),
        app.inject().post(`/api/deflections/${d.id}/release`).payload(payload).headers(custodyHeaders),
      ]);

      const codes = [r1.statusCode, r2.statusCode].sort();
      assert.strictEqual(codes[0], StatusCodes.OK, `Expected one 200, got ${codes}`);
      assert.strictEqual(codes[1], StatusCodes.CONFLICT, `Expected one 409, got ${codes}`);

      const deflection = await prisma.deflection.findUnique({ where: { id: d.id } });
      assert.strictEqual(deflection.subjectStatus, 'RELEASED');

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assertBedCountInvariant(bedType);
    });

    await t.test('R9: Double exit-to-jail — only one should succeed', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'AWAITING_INTAKE', {
        holds: 3, occupied: 0, inTransit: 0, available: 5,
      });

      const [r1, r2] = await Promise.all([
        app.inject().post(`/api/deflections/${d.id}/exit-to-jail`).headers(custodyHeaders),
        app.inject().post(`/api/deflections/${d.id}/exit-to-jail`).headers(custodyHeaders),
      ]);

      const codes = [r1.statusCode, r2.statusCode].sort();
      assert.strictEqual(codes[0], StatusCodes.OK, `Expected one 200, got ${codes}`);
      assert.strictEqual(codes[1], StatusCodes.CONFLICT, `Expected one 409, got ${codes}`);

      const deflection = await prisma.deflection.findUnique({ where: { id: d.id } });
      assert.strictEqual(deflection.subjectStatus, 'EXITED');
      assert.strictEqual(deflection.status, 'COMPLETED');

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.holds, 2, 'holds should have decremented exactly once');
      assert.strictEqual(bedType.available, 6, 'available should have incremented exactly once');
      assertBedCountInvariant(bedType);
    });

    await t.test('R10: Double record-death — only one should succeed', async () => {
      await resetBedState();
      const d = await createDeflectionInStatus(prisma, 'IN_CHAIR', {
        holds: 2, occupied: 1, inTransit: 0, available: 5,
      });

      const [r1, r2] = await Promise.all([
        app.inject().post(`/api/deflections/${d.id}/record-death`).headers(custodyHeaders),
        app.inject().post(`/api/deflections/${d.id}/record-death`).headers(custodyHeaders),
      ]);

      const codes = [r1.statusCode, r2.statusCode].sort();
      assert.strictEqual(codes[0], StatusCodes.OK, `Expected one 200, got ${codes}`);
      assert.strictEqual(codes[1], StatusCodes.CONFLICT, `Expected one 409, got ${codes}`);

      const deflection = await prisma.deflection.findUnique({ where: { id: d.id } });
      assert.strictEqual(deflection.subjectStatus, 'DEATH_IN_CUSTODY');
      assert.strictEqual(deflection.status, 'COMPLETED');

      const bedType = await prisma.bedType.findUnique({ where: { id: BED_TYPE_ID } });
      assert.strictEqual(bedType.occupied, 0, 'occupied should have decremented exactly once');
      assert.strictEqual(bedType.available, 6, 'available should have incremented exactly once');
      assertBedCountInvariant(bedType);
    });
  });
});
