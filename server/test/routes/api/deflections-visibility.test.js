import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';

import { authenticate, build } from '#test/helper.js';

// EXITED deflections must remain visible in list results for 72 hours
// after exit.
test('/api/deflections EXITED visibility window', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const regularUser = await prisma.user.findUniqueOrThrow({
    where: { email: 'regular.user@test.com' },
  });

  const facilityId = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
  const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';

  async function createExitedDeflection (exitedAt) {
    const subject = await prisma.subject.create({
      data: { firstName: 'Window', lastName: 'Boundary' },
    });
    const incident = await prisma.incident.create({
      data: {
        facilityId,
        encounteredVia: 'ON_VIEW',
        createdById: regularUser.id,
        updatedById: regularUser.id,
      },
    });
    return prisma.deflection.create({
      data: {
        incidentId: incident.id,
        facilityId,
        bedTypeId,
        subjectId: subject.id,
        createdById: regularUser.id,
        status: 'COMPLETED',
        subjectStatus: 'EXITED',
        exitedAt,
      },
    });
  }

  async function listIds (query) {
    const response = await app.inject().get(`/api/deflections?${query}`).headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    return JSON.parse(response.body).map((d) => d.id);
  }

  // The helper resets the database after each subtest, so each one creates
  // its own boundary rows.
  async function createBoundaryRows () {
    return {
      insideWindow: await createExitedDeflection(DateTime.now().minus({ hours: 71 }).toJSDate()),
      outsideWindow: await createExitedDeflection(DateTime.now().minus({ hours: 73 }).toJSDate()),
    };
  }

  await t.test('scope=history keeps EXITED rows visible for 72 hours after exit', async () => {
    const { insideWindow, outsideWindow } = await createBoundaryRows();
    const ids = await listIds('scope=history');
    assert.ok(ids.includes(insideWindow.id), 'deflection exited 71h ago should be visible');
    assert.ok(!ids.includes(outsideWindow.id), 'deflection exited 73h ago should be hidden');
  });

  await t.test('subjectStatus=EXITED filter honors the 72-hour window', async () => {
    const { insideWindow, outsideWindow } = await createBoundaryRows();
    const ids = await listIds('subjectStatus=EXITED');
    assert.ok(ids.includes(insideWindow.id), 'deflection exited 71h ago should be visible');
    assert.ok(!ids.includes(outsideWindow.id), 'deflection exited 73h ago should be hidden');
  });

  await t.test('mixed subjectStatus filter honors the 72-hour window for EXITED rows', async () => {
    const { insideWindow, outsideWindow } = await createBoundaryRows();
    const ids = await listIds('subjectStatus=RELEASED,EXITED');
    assert.ok(ids.includes(insideWindow.id), 'deflection exited 71h ago should be visible');
    assert.ok(!ids.includes(outsideWindow.id), 'deflection exited 73h ago should be hidden');
  });
});
