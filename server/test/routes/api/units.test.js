import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/organizations/:organizationId/units', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  const organizationId = 'sfpd';

  await t.test('GET /', async (t) => {
    await t.test('returns a list of units for an organization', async () => {
      const response = await app.inject()
        .get(`/api/organizations/${organizationId}/units`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      // Based on units.yml, sfpd has 5 units
      assert.deepStrictEqual(data.length, 5);

      const unit = data.find(u => u.id === 'option-1');
      assert.ok(unit);
      assert.deepStrictEqual(unit.name, 'OPTION 1');
      assert.deepStrictEqual(unit.organizationId, organizationId);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns unit details', async () => {
      const response = await app.inject()
        .get(`/api/organizations/${organizationId}/units/option-1`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, 'option-1');
      assert.deepStrictEqual(data.name, 'OPTION 1');
      assert.deepStrictEqual(data.organizationId, organizationId);
    });

    await t.test('returns 404 for non-existent unit', async () => {
      const response = await app.inject()
        .get(`/api/organizations/${organizationId}/units/NON-EXISTENT`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('POST /', async (t) => {
    await t.test('creates a new unit (admin only)', async () => {
      const newUnitId = 'NEW-UNIT';
      const response = await app.inject()
        .post(`/api/organizations/${organizationId}/units`)
        .payload({
          id: newUnitId,
          name: 'New Unit',
        })
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, newUnitId);
      assert.deepStrictEqual(data.name, 'NEW UNIT');
      assert.deepStrictEqual(data.organizationId, organizationId);

      // Verify in database
      const unit = await prisma.unit.findUnique({
        where: {
          unitId: {
            id: newUnitId,
            organizationId,
          },
        },
      });
      assert.ok(unit);
      assert.deepStrictEqual(unit.name, 'NEW UNIT');
    });

    await t.test('returns 403 for non-admin user', async () => {
      const response = await app.inject()
        .post(`/api/organizations/${organizationId}/units`)
        .payload({
          id: 'USER-UNIT',
          name: 'User Unit',
        })
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 for non-existent organization', async () => {
      const response = await app.inject()
        .post('/api/organizations/NON-EXISTENT/units')
        .payload({
          id: 'TEST-UNIT',
          name: 'Test Unit',
        })
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates unit fields (admin only)', async () => {
      const response = await app.inject()
        .patch(`/api/organizations/${organizationId}/units/option-1`)
        .payload({
          name: 'Updated Unit',
        })
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.name, 'UPDATED UNIT');

      // Verify in database
      const unit = await prisma.unit.findUnique({
        where: {
          unitId: {
            id: 'option-1',
            organizationId,
          },
        },
      });
      assert.deepStrictEqual(unit.name, 'UPDATED UNIT');
    });

    await t.test('returns 403 for non-admin user', async () => {
      const response = await app.inject()
        .patch(`/api/organizations/${organizationId}/units/option-1`)
        .payload({
          name: 'User Update',
        })
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 for non-existent unit', async () => {
      const response = await app.inject()
        .patch(`/api/organizations/${organizationId}/units/NON-EXISTENT`)
        .payload({
          name: 'Test',
        })
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });

  await t.test('DELETE /:id', async (t) => {
    await t.test('deletes a unit (admin only)', async () => {
      const response = await app.inject()
        .delete(`/api/organizations/${organizationId}/units/option-2`)
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);

      // Verify in database
      const unit = await prisma.unit.findUnique({
        where: {
          unitId: {
            id: 'option-2',
            organizationId,
          },
        },
      });
      assert.ok(!unit);
    });

    await t.test('returns 403 for non-admin user', async () => {
      const response = await app.inject()
        .delete(`/api/organizations/${organizationId}/units/option-3`)
        .headers(userHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns 404 for non-existent unit', async () => {
      const response = await app.inject()
        .delete(`/api/organizations/${organizationId}/units/NON-EXISTENT`)
        .headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });
  });
});
