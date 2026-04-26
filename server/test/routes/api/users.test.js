import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';
import path from 'path';

import { assetExists, authenticate, build, upload } from '#test/helper.js';
import User from '#models/user.js';

test('/api/users', async (t) => {
  const app = await build(t);
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
  const sfsoUserHeaders = await authenticate(app, 'sfsouser1@test.com', 'test');
  const { prisma } = app;

  await t.test('GET /', async (t) => {
    await t.test('returns a paginated, ordered list of Users', async (t) => {
      const response = await app.inject({
        url: '/api/users'
      }).headers(adminHeaders);
      const data = JSON.parse(response.payload);
      assert.deepStrictEqual(data.length, 10);
      assert.deepStrictEqual(data[0].email, 'admin.user@test.com');
      assert.deepStrictEqual(data[1].email, 'another.user@test.com');
      assert.deepStrictEqual(data[2].email, 'deactivated.user@test.com');
      assert.deepStrictEqual(data[3].email, 'dual.user@test.com');
      assert.deepStrictEqual(data[4].email, 'facilityadmin@test.com');
      assert.deepStrictEqual(data[5].email, 'orgadmin@test.com');
      assert.deepStrictEqual(data[6].email, 'regular.user@test.com');
      assert.deepStrictEqual(data[7].email, 'careuser1@test.com');
      assert.deepStrictEqual(data[8].email, 'sfsouser1@test.com');
      assert.deepStrictEqual(data[9].email, 'field.noholds@test.com');
    });
  });

  await t.test('GET /me', async (t) => {
    await t.test('returns no content when unauthenticated', async (t) => {
      const response = await app.inject({
        url: '/api/users/me'
      });
      assert.deepStrictEqual(response.statusCode, StatusCodes.NO_CONTENT);
    });

    await t.test('returns user data when authenticated', async (t) => {
      const response = await app.inject({
        url: '/api/users/me'
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      const { updatedAt } = data;
      assert.deepStrictEqual(data, {
        id: '555740af-17e9-48a3-93b8-d5236dfd2c29',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin.user@test.com',
        isAdmin: true,
        roles: [],
        picture: null,
        pictureUrl: null,
        organization: null,
        organizationId: null,
        badgeNumber: null,
        title: null,
        titleId: null,
        prop115Certified: false,
        unit: null,
        unitId: null,
        hasActiveHolds: false,
        createdAt: '2024-12-27T15:53:41.000Z',
        updatedAt,
        deactivatedAt: null,
        deletedAt: null
      });
    });

    await t.test('hasActiveHolds is false for single-role users even with active holds', async () => {
      const fieldUser = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      const incident = await prisma.incident.findFirst();
      await prisma.deflection.create({
        data: {
          facilityId: incident.facilityId,
          incidentId: incident.id,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          createdById: fieldUser.id,
          currentOfficerId: fieldUser.id,
          status: 'ACTIVE',
          subjectStatus: 'DETAINED',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const response = await app.inject({ url: '/api/users/me' }).headers(userHeaders);
      const data = JSON.parse(response.body);
      assert.strictEqual(data.hasActiveHolds, false);
    });

    await t.test('hasActiveHolds is false for dual-role user with no field work', async () => {
      const headers = await authenticate(app, 'dual.user@test.com', 'test');
      const response = await app.inject({ url: '/api/users/me' }).headers(headers);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.strictEqual(data.hasActiveHolds, false);
    });

    await t.test('hasActiveHolds is true for dual-role user with active hold', async () => {
      const headers = await authenticate(app, 'dual.user@test.com', 'test');
      const dualUser = await prisma.user.findUnique({ where: { email: 'dual.user@test.com' } });
      const incident = await prisma.incident.findFirst();
      await prisma.deflection.create({
        data: {
          facilityId: incident.facilityId,
          incidentId: incident.id,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          createdById: dualUser.id,
          currentOfficerId: dualUser.id,
          status: 'ACTIVE',
          subjectStatus: 'DETAINED',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const response = await app.inject({ url: '/api/users/me' }).headers(headers);
      const data = JSON.parse(response.body);
      assert.strictEqual(data.hasActiveHolds, true);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns a User by its id', async (t) => {
      const response = await app.inject({
        url: '/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5'
      }).headers(adminHeaders);
      const data = JSON.parse(response.payload);
      assert.deepStrictEqual(data, {
        id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5',
        firstName: 'Regular',
        lastName: 'User',
        email: 'regular.user@test.com',
        isAdmin: false,
        roles: ['FIELD'],
        picture: null,
        pictureUrl: null,
        organization: {
          id: 'sfpd',
          name: 'SFPD',
          defaultRoles: ['FIELD'],
          createdById: '555740af-17e9-48a3-93b8-d5236dfd2c29',
          createdAt: data.organization.createdAt,
          updatedAt: data.organization.updatedAt,
        },
        organizationId: 'sfpd',
        badgeNumber: null,
        title: null,
        titleId: null,
        prop115Certified: false,
        unit: null,
        unitId: null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deactivatedAt: null,
        deletedAt: null,
      });
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates attributes in user record', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'Newpassword123!'
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.email, 'john.doe@test.com');

      data = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.email, 'john.doe@test.com');

      const user = new User(data);
      assert.ok(await user.comparePassword('Newpassword123!'));
    });

    await t.test('attaches an uploaded picture', async (t) => {
      const picture = '56826175-033e-4a89-8d51-8d7f602e01d9.jpg';
      await upload([['640x480.jpg', picture]]);
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        picture
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.picture, picture);
      assert.deepStrictEqual(data.pictureUrl, `/api/assets/users/${data.id}/picture/${picture}`);

      data = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual(data.picture, picture);

      assert.ok(await assetExists(path.join('users', `${data.id}`, 'picture', picture)));
    });

    await t.test('disallows admin attribute changes for user', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        isAdmin: true,
        deactivatedAt: new Date().toISOString()
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('disallows user to update another user', async (t) => {
      const response = await app.inject().patch('/api/users/aa1fdcf6-a63c-454e-9775-2d6fd116fdb1').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'Newpassword123!'
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('allows admin to make admin changes to user', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        isAdmin: true,
        deactivatedAt: '2025-01-01T16:53:41.000Z'
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.isAdmin, true);
      assert.deepStrictEqual(data.deactivatedAt, '2025-01-01T16:53:41.000Z');

      data = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual(data.isAdmin, true);
      assert.deepStrictEqual(data.deactivatedAt, new Date('2025-01-01T16:53:41.000Z'));
    });

    await t.test('updates badgeNumber and title', async (t) => {
      const response = await app.inject().patch('/api/users/49acdf99-536f-49ac-8138-1c77e5087697').payload({
        badgeNumber: 'BADGE-12345',
        titleId: 'sheriff'
      }).headers(sfsoUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.badgeNumber, 'BADGE-12345');
      assert.deepStrictEqual(data.titleId, 'sheriff');

      data = await prisma.user.findUnique({ where: { id: '49acdf99-536f-49ac-8138-1c77e5087697' } });
      assert.deepStrictEqual(data.badgeNumber, 'BADGE-12345');
      assert.deepStrictEqual(data.titleId, 'sheriff');
    });

    await t.test('updates prop115Certified field', async (t) => {
      let response = await app.inject().patch('/api/users/49acdf99-536f-49ac-8138-1c77e5087697').payload({
        prop115Certified: true
      }).headers(sfsoUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.prop115Certified, true);

      data = await prisma.user.findUnique({ where: { id: '49acdf99-536f-49ac-8138-1c77e5087697' } });
      assert.deepStrictEqual(data.prop115Certified, true);

      response = await app.inject().patch('/api/users/49acdf99-536f-49ac-8138-1c77e5087697').payload({
        prop115Certified: false
      }).headers(sfsoUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      data = JSON.parse(response.body);
      assert.deepStrictEqual(data.prop115Certified, false);

      data = await prisma.user.findUnique({ where: { id: '49acdf99-536f-49ac-8138-1c77e5087697' } });
      assert.deepStrictEqual(data.prop115Certified, false);
    });

    await t.test('converts empty strings to null for badgeNumber and title', async (t) => {
      // First set values
      await prisma.user.update({
        where: { id: '49acdf99-536f-49ac-8138-1c77e5087697' },
        data: { badgeNumber: 'BADGE-999', titleId: 'sheriff' },
      });

      const response = await app.inject().patch('/api/users/49acdf99-536f-49ac-8138-1c77e5087697').payload({
        badgeNumber: '',
        titleId: ''
      }).headers(sfsoUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.badgeNumber, null);
      assert.deepStrictEqual(data.titleId, null);

      data = await prisma.user.findUnique({ where: { id: '49acdf99-536f-49ac-8138-1c77e5087697' } });
      assert.deepStrictEqual(data.badgeNumber, null);
      assert.deepStrictEqual(data.titleId, null);
    });

    await t.test('allows setting badgeNumber and title to null explicitly', async (t) => {
      // First set values
      await prisma.user.update({
        where: { id: '49acdf99-536f-49ac-8138-1c77e5087697' },
        data: { badgeNumber: 'BADGE-888', titleId: 'sheriff' },
      });

      const response = await app.inject().patch('/api/users/49acdf99-536f-49ac-8138-1c77e5087697').payload({
        badgeNumber: null,
        titleId: null
      }).headers(sfsoUserHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.badgeNumber, null);
      assert.deepStrictEqual(data.titleId, null);

      data = await prisma.user.findUnique({ where: { id: '49acdf99-536f-49ac-8138-1c77e5087697' } });
      assert.deepStrictEqual(data.badgeNumber, null);
      assert.deepStrictEqual(data.titleId, null);
    });

    await t.test('updates unit field', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        unitId: 'option-1'
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.unitId, 'option-1');

      data = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual(data.unitId, 'option-1');
    });

    await t.test('converts empty string to null for unit', async (t) => {
      // First set value
      await prisma.user.update({
        where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' },
        data: { unitId: 'option-1' },
      });

      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        unitId: ''
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.unitId, null);

      data = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual(data.unitId, null);
    });

    await t.test('allows setting unit to null explicitly', async (t) => {
      // First set value
      await prisma.user.update({
        where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' },
        data: { unitId: 'option-1' },
      });

      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        unitId: null
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.unitId, null);

      data = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual(data.unitId, null);
    });

    await t.test('creates and assigns a manually entered unit when one does not exist', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        unitName: 'Car 42'
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.unitId, 'car_42');
      assert.deepStrictEqual(data.unit.name, 'Car 42');

      const unit = await prisma.unit.findUnique({
        where: {
          unitId: {
            id: 'car_42',
            organizationId: 'sfpd',
          },
        },
      });
      assert.ok(unit);
      assert.deepStrictEqual(unit.name, 'Car 42');

      const user = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual(user.unitId, 'car_42');
    });

    await t.test('reuses an existing unit when a matching name is entered manually', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        unitName: 'option 1'
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.unitId, 'option-1');
      assert.deepStrictEqual(data.unit.name, 'Option 1');

      const matchingUnits = await prisma.unit.findMany({
        where: {
          organizationId: 'sfpd',
          name: {
            equals: 'Option 1',
            mode: 'insensitive',
          },
        },
      });
      assert.deepStrictEqual(matchingUnits.length, 1);
    });
  });

  await t.test('PATCH /:id (org admin)', async (t) => {
    await t.test('allows org admin to disable a user in their org', async (t) => {
      const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/49acdf99-536f-49ac-8138-1c77e5087697',
        headers: orgAdminHeaders,
        payload: {
          deactivatedAt: new Date().toISOString(),
        },
      });
      assert.strictEqual(response.statusCode, StatusCodes.OK);
    });

    await t.test('prevents org admin from disabling user in different org', async (t) => {
      const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5',
        headers: orgAdminHeaders,
        payload: {
          deactivatedAt: new Date().toISOString(),
        },
      });
      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('prevents org admin from disabling themselves', async (t) => {
      const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/b1a2c3d4-e5f6-7890-abcd-ef1234567890',
        headers: orgAdminHeaders,
        payload: {
          deactivatedAt: new Date().toISOString(),
        },
      });
      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });
  });

  await t.test('User.hasActiveHolds', async (t) => {
    // field.noholds@test.com has no deflections in the seed fixtures
    await t.test('returns false when the user has no deflections', async () => {
      const data = await prisma.user.findUnique({ where: { email: 'field.noholds@test.com' } });
      const user = new User(data);
      assert.equal(await user.hasActiveHolds(prisma), false);
    });

    // regular.user@test.com already has ACTIVE/DETAINED deflections in seed fixtures
    await t.test('returns true when user is currentOfficer on an ACTIVE, DETAINED deflection', async () => {
      const data = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });
      const user = new User(data);
      assert.equal(await user.hasActiveHolds(prisma), true);
    });

    await t.test('returns true for ONSITE_AWAITING_TRANSFER', async () => {
      const data = await prisma.user.findUnique({ where: { email: 'field.noholds@test.com' } });
      const user = new User(data);
      const incident = await prisma.incident.findFirst();
      await prisma.deflection.create({
        data: {
          facilityId: incident.facilityId,
          incidentId: incident.id,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          createdById: user.id,
          currentOfficerId: user.id,
          status: 'ACTIVE',
          subjectStatus: 'ONSITE_AWAITING_TRANSFER',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      assert.equal(await user.hasActiveHolds(prisma), true);
    });

    await t.test('returns false for AWAITING_INTAKE (already transferred)', async () => {
      const data = await prisma.user.findUnique({ where: { email: 'field.noholds@test.com' } });
      const user = new User(data);
      const incident = await prisma.incident.findFirst();
      await prisma.deflection.create({
        data: {
          facilityId: incident.facilityId,
          incidentId: incident.id,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          createdById: user.id,
          currentOfficerId: user.id,
          status: 'ACTIVE',
          subjectStatus: 'AWAITING_INTAKE',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      assert.equal(await user.hasActiveHolds(prisma), false);
    });

    await t.test('returns false when currentOfficer is a different user', async () => {
      const data = await prisma.user.findUnique({ where: { email: 'field.noholds@test.com' } });
      const user = new User(data);
      const other = await prisma.user.findUnique({ where: { email: 'another.user@test.com' } });
      const incident = await prisma.incident.findFirst();
      await prisma.deflection.create({
        data: {
          facilityId: incident.facilityId,
          incidentId: incident.id,
          bedTypeId: '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76',
          createdById: other.id,
          currentOfficerId: other.id,
          status: 'ACTIVE',
          subjectStatus: 'DETAINED',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      assert.equal(await user.hasActiveHolds(prisma), false);
    });
  });
});
