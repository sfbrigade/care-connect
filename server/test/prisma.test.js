import { test } from 'node:test';
import * as assert from 'node:assert';
import { DateTime } from 'luxon';

import { build } from '#test/helper.js';

test('Prisma Client Extensions', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  await t.test('deflection.expire()', async (t) => {
    // Helper to create a test incident with a specified number of deflections
    const createIncidentWithDeflections = async (count) => {
      const facilityId = '6d123d8f-edd5-4d14-9220-0508eb30b47b'; // Existing facility from fixtures
      const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76'; // Existing bedType from fixtures
      const user = await prisma.user.findFirst();

      const incident = await prisma.incident.create({
        data: {
          facilityId,
          encounteredVia: 'ON_VIEW',
          createdById: user.id,
          updatedById: user.id,
        },
      });

      const deflections = [];
      for (let i = 0; i < count; i++) {
        const deflection = await prisma.deflection.create({
          data: {
            incidentId: incident.id,
            facilityId,
            bedTypeId,
            createdById: user.id,
            expiresAt: DateTime.now().minus({ minutes: 10 }).toJSDate(), // Expired 10 mins ago
            status: 'ACTIVE',
          },
        });
        deflections.push(deflection);
      }

      return { incident, deflections };
    };

    await t.test('expires a single hold without affecting the incident', async () => {
      const { incident, deflections } = await createIncidentWithDeflections(1);

      await prisma.deflection.expire();

      const updatedDeflection = await prisma.deflection.findUnique({ where: { id: deflections[0].id } });
      assert.strictEqual(updatedDeflection.status, 'EXPIRED');

      // Incident is not affected (no lifecycle state)
      const updatedIncident = await prisma.incident.findUnique({ where: { id: incident.id } });
      assert.ok(updatedIncident);
    });

    await t.test('expires only holds past their expiresAt', async () => {
      const { deflections } = await createIncidentWithDeflections(2);

      // Set second deflection to expire in the future
      await prisma.deflection.update({
        where: { id: deflections[1].id },
        data: { expiresAt: DateTime.now().plus({ hours: 1 }).toJSDate() },
      });

      await prisma.deflection.expire();

      const updatedDeflection1 = await prisma.deflection.findUnique({ where: { id: deflections[0].id } });
      assert.strictEqual(updatedDeflection1.status, 'EXPIRED');

      const updatedDeflection2 = await prisma.deflection.findUnique({ where: { id: deflections[1].id } });
      assert.strictEqual(updatedDeflection2.status, 'ACTIVE');
    });
  });
});
