import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { build, authenticate } from '#test/helper.js';

// Regression: an org admin WITH a unit assigned used to get a 500 on both of these
// routes. The route re-wrapped request.user (already a User model) in a second
// User, and User's constructor rebuilds `data` with a spread when a unit is
// present — which dropped every field, leaving roles undefined and isOrgAdmin
// throwing. The unit is the trigger, so these fixtures MUST have one: without it
// the same tests pass against the broken code.
const ORG_ADMIN_ID = 'b1a2c3d4-e5f6-7890-abcd-ef1234567890'; // orgadmin@test.com, @sfso
const SFSO_USER_ID = '49acdf99-536f-49ac-8138-1c77e5087697'; // sfsouser1@test.com, @sfso
const CONNECTIONS_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-fa1234567890'; // facilityadmin@test.com, @connections

test('org admin with a unit assigned', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  // The shared fixture org admin has no unit; give them one. Re-applied before
  // every subtest because fixtures reload between test files and would otherwise
  // silently drop it — and without the unit these tests pass against the bug.
  async function attachUnit () {
    const updated = await prisma.user.update({
      where: { id: ORG_ADMIN_ID },
      data: { unit: { connect: { unitId: { id: 'option-1', organizationId: 'sfso' } } } },
      include: { unit: true },
    });
    assert.ok(updated.unit?.name, 'org admin must have a unit for this regression to be meaningful');
  }

  await attachUnit();
  const headers = await authenticate(app, 'orgadmin@test.com', 'test');

  await t.test('GET /api/users/:id — can read another user in their own org', async () => {
    await attachUnit();
    const response = await app.inject().get(`/api/users/${SFSO_USER_ID}`).headers(headers);

    assert.strictEqual(response.statusCode, StatusCodes.OK);
    assert.strictEqual(JSON.parse(response.body).email, 'sfsouser1@test.com');
  });

  await t.test('PATCH /api/users/:id — can edit another user in their own org', async () => {
    await attachUnit();
    const response = await app
      .inject()
      .patch(`/api/users/${SFSO_USER_ID}`)
      .headers(headers)
      .payload({ firstName: 'Renamed' });

    assert.strictEqual(response.statusCode, StatusCodes.OK);
    assert.strictEqual(JSON.parse(response.body).firstName, 'Renamed');
  });

  await t.test('GET /api/users/:id — still forbidden outside their org', async () => {
    await attachUnit();
    const response = await app.inject().get(`/api/users/${CONNECTIONS_USER_ID}`).headers(headers);

    assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
  });

  await t.test('PATCH /api/users/:id — still forbidden outside their org', async () => {
    await attachUnit();
    const response = await app
      .inject()
      .patch(`/api/users/${CONNECTIONS_USER_ID}`)
      .headers(headers)
      .payload({ firstName: 'Nope' });

    assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
  });

  await t.test('PATCH /api/users/:id — still cannot grant roles or admin', async () => {
    await attachUnit();
    const response = await app
      .inject()
      .patch(`/api/users/${SFSO_USER_ID}`)
      .headers(headers)
      .payload({ isAdmin: true });

    assert.strictEqual(response.statusCode, StatusCodes.FORBIDDEN);
  });
});
