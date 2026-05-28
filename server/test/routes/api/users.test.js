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
        deletedAt: null,
        satisfactionSurveyNextEligibleAt: null,
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

  await t.test('POST /me/satisfaction-survey-cooldown', async (t) => {
    function addOneCalendarMonth (ms) {
      const d = new Date(ms);
      d.setMonth(d.getMonth() + 1);
      return d.getTime();
    }

    function addOneWeek (ms) {
      const d = new Date(ms);
      d.setDate(d.getDate() + 7);
      return d.getTime();
    }

    await t.test('returns 401 when unauthenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey-cooldown',
      });
      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('returns 403 when the user is deactivated', async () => {
      const careHeaders = await authenticate(app, 'careuser1@test.com', 'test');
      const userId = '3f42ae6e-505d-499c-97f5-8fe712818f5b';
      await prisma.user.update({
        where: { id: userId },
        data: { deactivatedAt: new Date() },
      });
      try {
        const response = await app.inject({
          method: 'POST',
          url: '/api/users/me/satisfaction-survey-cooldown',
        }).headers(careHeaders);
        assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
      } finally {
        await prisma.user.update({
          where: { id: userId },
          data: { deactivatedAt: null },
        });
      }
    });

    await t.test('sets satisfactionSurveyNextEligibleAt to one week after createdAt when null', async () => {
      const userId = 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5';
      const { createdAt } = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { satisfactionSurveyNextEligibleAt: null },
      });
      const expectedMs = addOneWeek(createdAt.getTime());

      const response = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey-cooldown',
      }).headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);

      const body = JSON.parse(response.body);
      assert.ok(typeof body.satisfactionSurveyNextEligibleAt === 'string');
      const storedMs = new Date(body.satisfactionSurveyNextEligibleAt).getTime();
      assert.strictEqual(storedMs, expectedMs);

      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { satisfactionSurveyNextEligibleAt: true },
      });
      assert.ok(row.satisfactionSurveyNextEligibleAt);
      assert.strictEqual(row.satisfactionSurveyNextEligibleAt.toISOString(), body.satisfactionSurveyNextEligibleAt);

      await prisma.user.update({
        where: { id: userId },
        data: { satisfactionSurveyNextEligibleAt: null },
      });
    });

    await t.test('sets satisfactionSurveyNextEligibleAt to one calendar month after existing value when set', async () => {
      const userId = 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5';
      const existing = new Date('2025-03-15T12:00:00.000Z');
      await prisma.user.update({
        where: { id: userId },
        data: { satisfactionSurveyNextEligibleAt: existing },
      });
      const expectedMs = addOneCalendarMonth(existing.getTime());

      const response = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey-cooldown',
      }).headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);

      const body = JSON.parse(response.body);
      assert.ok(typeof body.satisfactionSurveyNextEligibleAt === 'string');
      const storedMs = new Date(body.satisfactionSurveyNextEligibleAt).getTime();
      assert.strictEqual(storedMs, expectedMs);

      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { satisfactionSurveyNextEligibleAt: true },
      });
      assert.ok(row.satisfactionSurveyNextEligibleAt);
      assert.strictEqual(row.satisfactionSurveyNextEligibleAt.toISOString(), body.satisfactionSurveyNextEligibleAt);

      await prisma.user.update({
        where: { id: userId },
        data: { satisfactionSurveyNextEligibleAt: null },
      });
    });
  });

  await t.test('POST /me/satisfaction-survey', async (t) => {
    const tooLongText = 'a'.repeat(5001);

    await t.test('requires authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey',
        payload: {
          answers: {
            careConnectRating: 'good',
          },
        },
      });
      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('returns 403 when the user has no survey organization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey',
        headers: adminHeaders,
        payload: {
          answers: {
            careConnectRating: 'good',
          },
        },
      });
      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('creates a survey using the authenticated user organization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey',
        headers: userHeaders,
        payload: {
          answers: {
            careConnectRating: 'neutral',
            resetFacilityFeedback: '  Helpful staff and fast process.  ',
            improvementSuggestions: '  More evening availability.  ',
          },
        },
      });

      assert.strictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      assert.ok(data.id);
      assert.ok(data.createdAt);

      const row = await prisma.satisfactionSurvey.findUnique({
        where: { id: data.id },
      });
      assert.ok(row);
      assert.strictEqual(row.organizationId, 'sfpd');
      assert.strictEqual(row.careConnectRating, 'neutral');
      assert.strictEqual(row.resetFacilityFeedback, 'Helpful staff and fast process.');
      assert.strictEqual(row.improvementSuggestions, 'More evening availability.');
    });

    await t.test('creates a survey for SFSO and CARE users from their organization', async () => {
      const sfsoResponse = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey',
        headers: sfsoUserHeaders,
        payload: {
          answers: {
            careConnectRating: 'good',
            resetFacilityFeedback: 'Smooth intake.',
          },
        },
      });
      assert.strictEqual(sfsoResponse.statusCode, StatusCodes.CREATED);
      const sfsoData = JSON.parse(sfsoResponse.body);
      const sfsoRow = await prisma.satisfactionSurvey.findUnique({
        where: { id: sfsoData.id },
      });
      assert.strictEqual(sfsoRow.organizationId, 'sfso');

      const careHeaders = await authenticate(app, 'careuser1@test.com', 'test');
      const careResponse = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey',
        headers: careHeaders,
        payload: {
          answers: {
            careConnectRating: 'bad',
            improvementSuggestions: 'Need clearer handoff steps.',
          },
        },
      });
      assert.strictEqual(careResponse.statusCode, StatusCodes.CREATED);
      const careData = JSON.parse(careResponse.body);
      const careRow = await prisma.satisfactionSurvey.findUnique({
        where: { id: careData.id },
      });
      assert.strictEqual(careRow.organizationId, 'connections');
    });

    await t.test('coerces whitespace-only optional text fields to null', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey',
        headers: userHeaders,
        payload: {
          answers: {
            careConnectRating: 'bad',
            resetFacilityFeedback: '   ',
            improvementSuggestions: '   ',
          },
        },
      });

      assert.strictEqual(response.statusCode, StatusCodes.CREATED);
      const data = JSON.parse(response.body);
      const row = await prisma.satisfactionSurvey.findUnique({
        where: { id: data.id },
      });
      assert.strictEqual(row.resetFacilityFeedback, null);
      assert.strictEqual(row.improvementSuggestions, null);
    });

    await t.test('validates request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey',
        headers: userHeaders,
        payload: {
          answers: {
            careConnectRating: 'great',
          },
        },
      });

      assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('rejects client-supplied organizationId in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey',
        headers: userHeaders,
        payload: {
          organizationId: 'sfso',
          answers: {
            careConnectRating: 'good',
          },
        },
      });

      assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('returns 422 when optional text exceeds 5000 characters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/me/satisfaction-survey',
        headers: userHeaders,
        payload: {
          answers: {
            careConnectRating: 'good',
            resetFacilityFeedback: tooLongText,
          },
        },
      });

      assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
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
        satisfactionSurveyNextEligibleAt: null,
      });
    });
  });

  await t.test('PATCH /:id', async (t) => {
    await t.test('updates attributes in user record', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com'
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
      assert.ok(await user.comparePassword('test'));
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
        email: 'john.doe@test.com'
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('rejects password changes on the profile endpoint', async () => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        password: 'Newpassword123!'
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
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

    await t.test('allows admin to add ORG_ADMIN to a user', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        roles: ['FIELD', 'ORG_ADMIN'],
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual([...data.roles].sort(), ['FIELD', 'ORG_ADMIN']);

      const dbData = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.deepStrictEqual([...dbData.roles].sort(), ['FIELD', 'ORG_ADMIN']);
    });

    await t.test('allows admin to add FACILITY_ADMIN preserving other roles', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        roles: ['FIELD', 'FACILITY_ADMIN'],
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual([...data.roles].sort(), ['FACILITY_ADMIN', 'FIELD']);
    });

    await t.test('allows admin to remove ORG_ADMIN preserving other roles', async (t) => {
      // orgadmin@test.com starts with [CUSTODY, ORG_ADMIN]
      const response = await app.inject().patch('/api/users/b1a2c3d4-e5f6-7890-abcd-ef1234567890').payload({
        roles: ['CUSTODY'],
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.roles, ['CUSTODY']);
    });

    await t.test('disallows non-admin user from changing their own roles', async (t) => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5').payload({
        roles: ['FIELD', 'FACILITY_ADMIN'],
      }).headers(userHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('disallows org admin from changing roles of a teammate', async (t) => {
      const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
      const response = await app.inject().patch('/api/users/49acdf99-536f-49ac-8138-1c77e5087697').payload({
        roles: ['CUSTODY', 'ORG_ADMIN'],
      }).headers(orgAdminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('disallows admin from changing their own roles', async (t) => {
      // admin.user@test.com cannot self-grant ORG_ADMIN/FACILITY_ADMIN
      const response = await app.inject().patch('/api/users/555740af-17e9-48a3-93b8-d5236dfd2c29').payload({
        roles: ['ORG_ADMIN'],
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('disallows admin from toggling their own admin status', async (t) => {
      // admin.user@test.com cannot self-revoke isAdmin
      const response = await app.inject().patch('/api/users/555740af-17e9-48a3-93b8-d5236dfd2c29').payload({
        isAdmin: false,
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.FORBIDDEN);
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
      assert.deepStrictEqual(data.unit.name, 'CAR 42');

      const unit = await prisma.unit.findUnique({
        where: {
          unitId: {
            id: 'car_42',
            organizationId: 'sfpd',
          },
        },
      });
      assert.ok(unit);
      assert.deepStrictEqual(unit.name, 'CAR 42');

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
      assert.deepStrictEqual(data.unit.name, 'OPTION 1');

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

  await t.test('PATCH /:id/password', async (t) => {
    await t.test('prevents non-admins from setting another user password', async () => {
      const response = await app.inject().patch('/api/users/aa1fdcf6-a63c-454e-9775-2d6fd116fdb1/password').payload({
        password: 'Newpassword123!'
      }).headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('allows admins to set a password and records an audit event', async () => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5/password').payload({
        password: 'Newpassword123!'
      }).headers(adminHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);

      const data = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      const user = new User(data);
      assert.ok(await user.comparePassword('Newpassword123!'));

      const event = await prisma.adminSecurityEvent.findFirst({
        where: {
          action: 'USER_PASSWORD_SET',
          actorUserId: '555740af-17e9-48a3-93b8-d5236dfd2c29',
          targetUserId: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5',
        },
      });
      assert.ok(event);
      assert.strictEqual(event.metadata, null);
    });

    await t.test('clears password reset and active MFA challenge fields', async () => {
      await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      await prisma.user.update({
        where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' },
        data: {
          passwordResetToken: '11111111-2222-4333-8444-555555555555',
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const before = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.ok(before.mfaCode);
      assert.ok(before.mfaToken);
      assert.ok(before.passwordResetToken);

      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5/password').payload({
        password: 'Newpassword123!'
      }).headers(adminHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);

      const after = await prisma.user.findUnique({ where: { id: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5' } });
      assert.strictEqual(after.passwordResetToken, null);
      assert.strictEqual(after.passwordResetExpiresAt, null);
      assert.strictEqual(after.mfaCode, null);
      assert.strictEqual(after.mfaToken, null);
      assert.strictEqual(after.mfaExpiresAt, null);
      assert.strictEqual(after.mfaAttempts, 0);
      assert.strictEqual(after.mfaLastSentAt, null);
    });

    await t.test('validates password strength', async () => {
      const response = await app.inject().patch('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5/password').payload({
        password: 'too-short'
      }).headers(adminHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });
  });

  await t.test('GET /:id/mfa-code', async (t) => {
    await t.test('prevents non-admins from viewing MFA codes', async () => {
      const response = await app.inject().get('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5/mfa-code').headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('returns no content when no active MFA code exists', async () => {
      const response = await app.inject().get('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5/mfa-code').headers(adminHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.NO_CONTENT);
    });

    await t.test('shows active MFA code and records audit event without token metadata', async () => {
      const loginResponse = await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      const { mfaToken } = JSON.parse(loginResponse.body);
      const user = await prisma.user.findUnique({ where: { email: 'regular.user@test.com' } });

      const response = await app.inject().get('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5/mfa-code').headers(adminHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);
      assert.strictEqual(response.headers['cache-control'], 'no-store');
      assert.strictEqual(response.headers.pragma, 'no-cache');
      const data = JSON.parse(response.body);
      assert.strictEqual(data.code, user.mfaCode);
      assert.strictEqual(data.attemptsRemaining, 5);
      assert.ok(data.expiresAt);
      assert.strictEqual(data.mfaToken, undefined);

      const event = await prisma.adminSecurityEvent.findFirst({
        where: {
          action: 'USER_MFA_CODE_VIEWED',
          actorUserId: '555740af-17e9-48a3-93b8-d5236dfd2c29',
          targetUserId: 'dab5dff3-360d-4dbb-98dd-1990dfb5c4c5',
        },
      });
      assert.ok(event);
      assert.strictEqual(event.metadata.code, undefined);
      assert.strictEqual(event.metadata.mfaToken, undefined);
      assert.strictEqual(event.metadata.attemptsRemaining, 5);
      assert.notStrictEqual(mfaToken, data.code);
    });

    await t.test('does not return expired codes', async () => {
      await app.inject().post('/api/auth/login').payload({
        email: 'regular.user@test.com',
        password: 'test',
      });
      await prisma.user.update({
        where: { email: 'regular.user@test.com' },
        data: { mfaExpiresAt: new Date(Date.now() - 1000) },
      });

      const response = await app.inject().get('/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5/mfa-code').headers(adminHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.NO_CONTENT);
    });
  });

  await t.test('PATCH /:id (org admin)', async (t) => {
    await t.test('allows org admin to view a user in their org', async (t) => {
      const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/49acdf99-536f-49ac-8138-1c77e5087697',
        headers: orgAdminHeaders,
      });
      assert.strictEqual(response.statusCode, StatusCodes.OK);
    });

    await t.test('prevents org admin from viewing a user in a different org', async (t) => {
      const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/dab5dff3-360d-4dbb-98dd-1990dfb5c4c5',
        headers: orgAdminHeaders,
      });
      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

    await t.test('allows org admin to update user profile fields in their org', async (t) => {
      const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/49acdf99-536f-49ac-8138-1c77e5087697',
        headers: orgAdminHeaders,
        payload: {
          firstName: 'Updated',
          lastName: 'Officer',
          email: 'updated.sfso.user@test.com',
          badgeNumber: '9876',
          prop115Certified: true,
        },
      });
      assert.strictEqual(response.statusCode, StatusCodes.OK);

      const body = response.json();
      assert.strictEqual(body.firstName, 'Updated');
      assert.strictEqual(body.lastName, 'Officer');
      assert.strictEqual(body.email, 'updated.sfso.user@test.com');
      assert.strictEqual(body.badgeNumber, '9876');
      assert.strictEqual(body.prop115Certified, true);
    });

    await t.test('prevents org admin from updating privileged fields', async (t) => {
      const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/49acdf99-536f-49ac-8138-1c77e5087697',
        headers: orgAdminHeaders,
        payload: {
          isAdmin: true,
        },
      });
      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });

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
