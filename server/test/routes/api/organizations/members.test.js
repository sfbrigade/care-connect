import { test } from 'node:test';
import * as assert from 'node:assert';

import { authenticate, build } from '#test/helper.js';

test('GET /api/organizations/:organizationId/members', async (t) => {
  const app = await build(t);
  const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');
  const orgAdminHeaders = await authenticate(app, 'orgadmin@test.com', 'test');
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  await t.test('returns 401 if not authenticated', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/organizations/sfso/members',
    });
    assert.strictEqual(response.statusCode, 401);
  });

  await t.test('returns 403 if user does not have ORG_ADMIN role', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/organizations/sfpd/members',
      headers: userHeaders,
    });
    assert.strictEqual(response.statusCode, 403);
  });

  await t.test('returns 403 if org admin requests a different org', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/organizations/sfpd/members',
      headers: orgAdminHeaders,
    });
    assert.strictEqual(response.statusCode, 403);
  });

  await t.test('returns grouped members for org admin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/organizations/sfso/members',
      headers: orgAdminHeaders,
    });
    assert.strictEqual(response.statusCode, 200);
    const body = response.json();
    assert.ok(Array.isArray(body.invited));
    assert.ok(Array.isArray(body.active));
    assert.ok(Array.isArray(body.disabled));
  });

  await t.test('returns grouped members for super admin (any org)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/organizations/sfso/members',
      headers: adminHeaders,
    });
    assert.strictEqual(response.statusCode, 200);
    const body = response.json();
    assert.ok(Array.isArray(body.invited));
    assert.ok(Array.isArray(body.active));
    assert.ok(Array.isArray(body.disabled));
  });

  await t.test('does not include expired invites in the invited list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/organizations/sfso/members',
      headers: orgAdminHeaders,
    });
    const body = response.json();
    const expiredInvite = body.invited.find((i) => i.email === 'expired@test.com');
    assert.strictEqual(expiredInvite, undefined);
  });

  await t.test('does not include deleted users', async () => {
    await app.prisma.user.update({
      where: { id: '49acdf99-536f-49ac-8138-1c77e5087697' },
      data: { deactivatedAt: new Date(), deletedAt: new Date() },
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/organizations/sfso/members',
      headers: orgAdminHeaders,
    });
    const body = response.json();
    const allMembers = [...body.invited, ...body.active, ...body.disabled];
    const deletedUser = allMembers.find((m) => m.id === '49acdf99-536f-49ac-8138-1c77e5087697');
    assert.strictEqual(deletedUser, undefined);
  });

  await t.test('marks the current user with isCurrentUser: true', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/organizations/sfso/members',
      headers: orgAdminHeaders,
    });
    const body = response.json();
    const currentUser = body.active.find((m) => m.email === 'orgadmin@test.com');
    assert.strictEqual(currentUser?.isCurrentUser, true);
  });
});
