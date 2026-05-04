import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/invites', async (t) => {
  const app = await build(t);
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
  const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
  const { prisma } = app;

  await t.test('GET /', async (t) => {
    await t.test('returns a list of Invites', async (t) => {
      const response = await app.inject().get('/api/invites').headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.ok(Array.isArray(data));
      assert.deepStrictEqual(data.length, 3);
    });
  });

  await t.test('POST /', async (t) => {
    await t.test('creates a new Invite with minimum fields', async (t) => {
      const response = await app.inject().post('/api/invites').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        message: 'Welcome!',
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.email, 'john.doe@test.com');
      assert.deepStrictEqual(data.message, 'Welcome!');
      assert.deepStrictEqual(data.organizationId, null);
      assert.deepStrictEqual(data.titleId, null);
      assert.deepStrictEqual(data.prop115Certified, false);

      data = await prisma.invite.findUnique({ where: { id: data.id } });
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.email, 'john.doe@test.com');
      assert.deepStrictEqual(data.message, 'Welcome!');
      assert.deepStrictEqual(data.organizationId, null);
      assert.deepStrictEqual(data.titleId, null);
      assert.deepStrictEqual(data.prop115Certified, false);

      assert.deepStrictEqual(app.backgroundJobs._sent.length, 1);
      assert.deepStrictEqual(app.backgroundJobs._sent[0].name, 'invite-email');
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data.inviteId, data.id);
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data.facilityId, null);
    });

    await t.test('creates a new Invite with some fields', async (t) => {
      const response = await app.inject().post('/api/invites').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        message: 'Welcome!',
        organizationId: 'sfpd',
        badgeNumber: '1234',
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.email, 'john.doe@test.com');
      assert.deepStrictEqual(data.message, 'Welcome!');
      assert.deepStrictEqual(data.organizationId, 'sfpd');
      assert.deepStrictEqual(data.titleId, null);
      assert.deepStrictEqual(data.badgeNumber, '1234');
      assert.deepStrictEqual(data.prop115Certified, false);

      data = await prisma.invite.findUnique({ where: { id: data.id } });
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.email, 'john.doe@test.com');
      assert.deepStrictEqual(data.message, 'Welcome!');
      assert.deepStrictEqual(data.organizationId, 'sfpd');
      assert.deepStrictEqual(data.titleId, null);
      assert.deepStrictEqual(data.badgeNumber, '1234');
      assert.deepStrictEqual(data.prop115Certified, false);

      assert.deepStrictEqual(app.backgroundJobs._sent.length, 1);
      assert.deepStrictEqual(app.backgroundJobs._sent[0].name, 'invite-email');
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data.inviteId, data.id);
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data.facilityId, null);
    });

    await t.test('creates a new Invite with all fields', async (t) => {
      const response = await app.inject().post('/api/invites').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        message: 'Welcome!',
        organizationId: 'sfso',
        titleId: 'sheriff',
        badgeNumber: '1234',
        prop115Certified: true,
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.CREATED);

      let data = JSON.parse(response.body);
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.email, 'john.doe@test.com');
      assert.deepStrictEqual(data.message, 'Welcome!');
      assert.deepStrictEqual(data.organizationId, 'sfso');
      assert.deepStrictEqual(data.titleId, 'sheriff');
      assert.deepStrictEqual(data.badgeNumber, '1234');
      assert.deepStrictEqual(data.prop115Certified, true);

      data = await prisma.invite.findUnique({ where: { id: data.id } });
      assert.deepStrictEqual(data.firstName, 'John');
      assert.deepStrictEqual(data.lastName, 'Doe');
      assert.deepStrictEqual(data.email, 'john.doe@test.com');
      assert.deepStrictEqual(data.message, 'Welcome!');
      assert.deepStrictEqual(data.organizationId, 'sfso');
      assert.deepStrictEqual(data.titleId, 'sheriff');
      assert.deepStrictEqual(data.badgeNumber, '1234');
      assert.deepStrictEqual(data.prop115Certified, true);

      assert.deepStrictEqual(app.backgroundJobs._sent.length, 1);
      assert.deepStrictEqual(app.backgroundJobs._sent[0].name, 'invite-email');
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data.inviteId, data.id);
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data.facilityId, null);
    });

    await t.test('requires a star number for SFPD invites', async (t) => {
      const response = await app.inject().post('/api/invites').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        organizationId: 'sfpd',
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);

      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.errors, [
        { path: 'badgeNumber', message: 'Star number is required.' },
      ]);
    });

    await t.test('requires a star number and rank for SFSO org admin invites', async (t) => {
      const response = await app.inject().post('/api/invites').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
      }).headers(orgAdminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);

      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.errors, [
        { path: 'badgeNumber', message: 'Star number is required.' },
        { path: 'titleId', message: 'Rank is required.' },
      ]);
    });

    await t.test('requires star number to match incident form length', async (t) => {
      const response = await app.inject().post('/api/invites').payload({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        organizationId: 'sfso',
        titleId: 'sheriff',
        badgeNumber: '12345',
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);

      const error = JSON.parse(response.body);
      assert.deepStrictEqual(error.errors, [
        { path: 'badgeNumber', message: 'Star number must be 4 characters or fewer.' },
      ]);
    });
  });

  await t.test('POST /bulk', async (t) => {
    await t.test('creates invites and skips existing users/invites', async (t) => {
      const response = await app.inject().post('/api/invites/bulk').payload({
        invites: [
          {
            firstName: 'New',
            lastName: 'Invite',
            email: 'new.invite@test.com',
          },
          {
            firstName: 'Existing',
            lastName: 'User',
            email: 'admin.user@test.com',
          },
          {
            firstName: 'Existing',
            lastName: 'Invite',
            email: 'invited.user.2@test.com',
          },
        ]
      }).headers(adminHeaders);

      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.invitedCount, 1);
      assert.deepStrictEqual(data.existingCount, 2);
      assert.deepStrictEqual(data.errorCount, 0);
      assert.deepStrictEqual(data.errors.length, 0);

      const createdInvite = await prisma.invite.findFirst({
        where: { email: 'new.invite@test.com' },
      });
      assert.ok(createdInvite);

      assert.deepStrictEqual(app.backgroundJobs._sent.length, 1);
      assert.deepStrictEqual(app.backgroundJobs._sent[0].name, 'invite-email');
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data.inviteId, createdInvite.id);
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data.facilityId, null);
    });

    await t.test('persists organizationId so register applies multi-role org defaults', async (t) => {
      const response = await app.inject().post('/api/invites/bulk').payload({
        organizationId: 'sfso',
        invites: [
          {
            firstName: 'Multi',
            lastName: 'Role',
            email: 'multi.role@test.com',
          },
        ],
      }).headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const createdInvite = await prisma.invite.findFirst({
        where: { email: 'multi.role@test.com' },
      });
      assert.ok(createdInvite);
      assert.deepStrictEqual(createdInvite.organizationId, 'sfso');

      const registerResponse = await app.inject().post('/api/auth/register').payload({
        firstName: 'Ignored',
        lastName: 'Ignored',
        email: 'ignored@test.com',
        password: 'Abcdef12345!',
        inviteId: createdInvite.id,
      });
      assert.deepStrictEqual(registerResponse.statusCode, StatusCodes.CREATED);

      const user = JSON.parse(registerResponse.body);
      assert.deepStrictEqual(user.organizationId, 'sfso');
      assert.deepStrictEqual(user.roles, ['FIELD', 'CUSTODY']);
    });
  });

  await t.test('GET /:id', async (t) => {
    await t.test('returns a valid Invite', async (t) => {
      const response = await app.inject().get('/api/invites/7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de');
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.deepStrictEqual(data.id, '7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de');
      assert.deepStrictEqual(data.firstName, 'Invited');
      assert.deepStrictEqual(data.lastName, 'User 2');
      assert.deepStrictEqual(data.email, 'invited.user.2@test.com');
      assert.deepStrictEqual(data.message, 'This is an invitation to Invited User 2.');
    });

    await t.test('returns forbidden for accepted/revoked invite', async (t) => {
      let response = await app.inject().get('/api/invites/e28fddba-8e9b-41c9-924a-c5f1f4a2f8f6');
      assert.deepStrictEqual(response.statusCode, StatusCodes.GONE);

      response = await app.inject().get('/api/invites/157d4be5-fd7d-4d08-b74e-2d3584062c8a');
      assert.deepStrictEqual(response.statusCode, StatusCodes.GONE);
    });
  });

  await t.test('PATCH /:id/resend', async (t) => {
    await t.test('resends an Invite', async (t) => {
      const response = await app.inject().patch('/api/invites/7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de/resend').headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      assert.deepStrictEqual(app.backgroundJobs._sent.length, 1);
      assert.deepStrictEqual(app.backgroundJobs._sent[0].name, 'invite-email');
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data.inviteId, '7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de');
      assert.deepStrictEqual(app.backgroundJobs._sent[0].data.facilityId, null);
    });

    await t.test('returns gone for accepted/revoked invite', async (t) => {
      let response = await app.inject().patch('/api/invites/e28fddba-8e9b-41c9-924a-c5f1f4a2f8f6/resend').headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.GONE);

      response = await app.inject().patch('/api/invites/157d4be5-fd7d-4d08-b74e-2d3584062c8a/resend').headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.GONE);
    });
  });

  await t.test('POST / (org admin)', async (t) => {
    await t.test('allows org admin to create invite for their own org', async (t) => {
      const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
      const response = await app.inject({
        method: 'POST',
        url: '/api/invites',
        headers: orgAdminHeaders,
        payload: {
          firstName: 'New',
          lastName: 'User',
          email: 'newuser@test.com',
          organizationId: 'sfso',
          titleId: 'sheriff',
          badgeNumber: '1234',
        },
      });
      assert.strictEqual(response.statusCode, StatusCodes.CREATED);
    });

    await t.test('prevents org admin from creating invite for different org', async (t) => {
      const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
      const response = await app.inject({
        method: 'POST',
        url: '/api/invites',
        headers: orgAdminHeaders,
        payload: {
          firstName: 'New',
          lastName: 'User',
          email: 'newuser2@test.com',
          organizationId: 'sfpd',
        },
      });
      assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
    });
  });

  await t.test('DELETE /:id', async (t) => {
    await t.test('revokes an Invite', async (t) => {
      const response = await app.inject().delete('/api/invites/7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de').headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.OK);

      let data = JSON.parse(response.body);
      assert.ok(data.revokedAt);
      assert.deepStrictEqual(data.revokedById, '555740af-17e9-48a3-93b8-d5236dfd2c29');

      data = await prisma.invite.findUnique({ where: { id: '7d7c61a6-55ac-4bad-8c8c-5d3aaaa1c5de' } });
      assert.ok(data.revokedAt);
      assert.deepStrictEqual(data.revokedById, '555740af-17e9-48a3-93b8-d5236dfd2c29');
    });

    await t.test('returns gone for already accepted/revoked invite', async (t) => {
      let response = await app.inject().delete('/api/invites/e28fddba-8e9b-41c9-924a-c5f1f4a2f8f6').headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.GONE);

      response = await app.inject().delete('/api/invites/157d4be5-fd7d-4d08-b74e-2d3584062c8a').headers(adminHeaders);
      assert.deepStrictEqual(response.statusCode, StatusCodes.GONE);
    });
  });
});
