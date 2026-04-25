import { test } from 'node:test';
import * as assert from 'node:assert';
import { DateTime } from 'luxon';

import { build } from '#test/helper.js';

test('expireHolds job', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  // Dynamic import so prisma/client.js picks up the testcontainer DATABASE_URL
  const { default: expireHolds } = await import('../../jobs/expireHolds.js');

  const facilityId = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
  const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';

  await t.test('expires active holds past expiresAt', async () => {
    const user = await prisma.user.findFirst();

    const incident = await prisma.incident.create({
      data: {
        facilityId,
        encounteredVia: 'ON_VIEW',
        createdById: user.id,
        updatedById: user.id,
      },
    });

    const deflection = await prisma.deflection.create({
      data: {
        incidentId: incident.id,
        facilityId,
        bedTypeId,
        createdById: user.id,
        expiresAt: DateTime.now().minus({ minutes: 10 }).toJSDate(),
        status: 'ACTIVE',
      },
    });

    await expireHolds({}, prisma);

    const updated = await prisma.deflection.findUnique({
      where: { id: deflection.id },
    });
    assert.strictEqual(updated.status, 'EXPIRED');
  });

  await t.test('does not expire holds that are not yet past expiresAt', async () => {
    const user = await prisma.user.findFirst();

    const incident = await prisma.incident.create({
      data: {
        facilityId,
        encounteredVia: 'ON_VIEW',
        createdById: user.id,
        updatedById: user.id,
      },
    });

    const deflection = await prisma.deflection.create({
      data: {
        incidentId: incident.id,
        facilityId,
        bedTypeId,
        createdById: user.id,
        expiresAt: DateTime.now().plus({ hours: 1 }).toJSDate(),
        status: 'ACTIVE',
      },
    });

    await expireHolds({}, prisma);

    const updated = await prisma.deflection.findUnique({
      where: { id: deflection.id },
    });
    assert.strictEqual(updated.status, 'ACTIVE');
  });
});
