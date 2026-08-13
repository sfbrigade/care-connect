import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { build, authenticate } from '#test/helper.js';

// Regression: an org admin WITH a unit assigned used to get a 500 on both of these
// routes. The route re-wrapped request.user (already a User model) in a second
// User, and User's constructor rebuilds `data` with a spread when a unit is
// present — which dropped every field, leaving roles undefined so isOrgAdmin threw.
//
// The unit is the trigger, so the fixtures MUST have one: without it these tests
// pass against the broken code. Org-admin authorization itself (denials across
// orgs, privileged fields) is covered in users.test.js.
const ORG_ADMIN_ID = 'b1a2c3d4-e5f6-7890-abcd-ef1234567890'; // orgadmin@test.com, @sfso
const SFSO_USER_ID = '49acdf99-536f-49ac-8138-1c77e5087697'; // sfsouser1@test.com, @sfso

test('org admin with a unit assigned', async (t) => {
  const app = await build(t);
  const { prisma } = app;

  // Re-applied before every subtest: fixtures reload between test files and would
  // otherwise silently drop the unit, quietly disarming the regression.
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
});
