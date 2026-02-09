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

    await t.test('closes incident when single hold expires', async () => {
      const { incident } = await createIncidentWithDeflections(1);

      // Initial state: incident is active (not completed)
      assert.strictEqual(incident.completedAt, null);

      // Run expiry logic
      await prisma.deflection.expire();

      // Fetch updated incident
      const updatedIncident = await prisma.incident.findUnique({
        where: { id: incident.id },
      });

      // Verify incident is now completed
      assert.ok(updatedIncident.completedAt);
    });

    await t.test('incident remains open if other holds are active', async () => {
      const { incident, deflections } = await createIncidentWithDeflections(2);

      // Allow the second deflection to be ACTIVE and valid (future expiry)
      await prisma.deflection.update({
        where: { id: deflections[1].id },
        data: { expiresAt: DateTime.now().plus({ hours: 1 }).toJSDate() },
      });

      // Run expiry logic (should only expire the first deflection)
      await prisma.deflection.expire();

      // Deflection 1 should be EXPIRED
      const updatedDeflection1 = await prisma.deflection.findUnique({ where: { id: deflections[0].id } });
      assert.strictEqual(updatedDeflection1.status, 'EXPIRED');

      // Deflection 2 should remain ACTIVE
      const updatedDeflection2 = await prisma.deflection.findUnique({ where: { id: deflections[1].id } });
      assert.strictEqual(updatedDeflection2.status, 'ACTIVE');

      // Incident should still be OPEN because Deflection 2 is active
      const updatedIncident = await prisma.incident.findUnique({
        where: { id: incident.id },
      });
      assert.strictEqual(updatedIncident.completedAt, null);
    });

    await t.test('closes incident after last hold expires', async () => {
      // Reuse logic similar to above but manually ensuring specific state
      const { incident, deflections } = await createIncidentWithDeflections(2);

      // 1. Set one to expire now, one to expire in future
      await prisma.deflection.update({ where: { id: deflections[1].id }, data: { expiresAt: DateTime.now().plus({ hours: 1 }).toJSDate() } });

      // 2. Run expire - incident should stay open
      await prisma.deflection.expire();
      let updatedIncident = await prisma.incident.findUnique({ where: { id: incident.id } });
      assert.strictEqual(updatedIncident.completedAt, null);

      // 3. Set the remaining active hold to be expired
      await prisma.deflection.update({
        where: { id: deflections[1].id },
        data: { expiresAt: DateTime.now().minus({ minutes: 5 }).toJSDate() }
      });

      // 4. Run expire again
      await prisma.deflection.expire();

      // 5. Incident should now be closed
      updatedIncident = await prisma.incident.findUnique({ where: { id: incident.id } });
      assert.ok(updatedIncident.completedAt);
    });
  });
});
