import { test } from 'node:test';
import * as assert from 'node:assert';
import { serializerCompiler } from 'fastify-zod-openapi';

import Base from '#models/base.js';
import Organization from '#models/organization.js';
import User from '#models/user.js';

test('model property presence includes loaded data and computed properties', () => {
  class Example extends Base {
    get displayName () {
      return this.name.toUpperCase();
    }
  }

  const model = new Example({ name: 'name', omitted: 'omitted' }, {
    name: 'Test',
    relation: { id: 'related' },
    nullable: null,
    explicitUndefined: undefined,
  });

  for (const key of ['name', 'relation', 'nullable', 'explicitUndefined', 'displayName', 'update', 'toJSON']) {
    assert.ok(key in model, `${key} should be present`);
  }
  assert.strictEqual(model.displayName, 'TEST');
  assert.strictEqual('omitted' in model, false);
  assert.strictEqual('unknown' in model, false);

  model.omitted = 'Now loaded';
  assert.ok('omitted' in model);
  assert.strictEqual(model.omitted, 'Now loaded');
  assert.ok(model.changes.has('omitted'));
});

function userData () {
  const id = '11111111-1111-4111-8111-111111111111';
  const timestamp = new Date('2026-01-01T00:00:00.000Z');
  return {
    id,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    picture: 'avatar.png',
    isAdmin: false,
    roles: ['CUSTODY'],
    organization: new Organization({
      id: 'test-org',
      name: 'Test organization',
      createdById: id,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
    createdAt: timestamp,
    updatedAt: timestamp,
    deactivatedAt: null,
    deletedAt: null,
    satisfactionSurveyNextEligibleAt: null,
    hashedPassword: 'private-password-hash',
    mfaCode: '123456',
    mfaToken: id,
  };
}

function userSerializer () {
  return serializerCompiler({
    schema: User.ResponseSchema,
    method: 'POST',
    url: '/api/auth/verify-code',
  });
}

test('API serialization preserves model fields, getters, and nested models without exposing secrets', () => {
  const data = userData();
  const body = JSON.parse(userSerializer()(new User(data)));

  assert.strictEqual(body.id, data.id);
  assert.strictEqual(body.firstName, data.firstName);
  assert.strictEqual(body.lastName, data.lastName);
  assert.strictEqual(body.email, data.email);
  assert.deepStrictEqual(body.roles, ['CUSTODY']);
  assert.strictEqual(body.pictureUrl, `/api/assets/users/${data.id}/picture/avatar.png`);
  assert.strictEqual(body.organization.id, 'test-org');
  assert.strictEqual(body.organization.name, 'Test organization');
  assert.strictEqual(body.createdAt, data.createdAt.toISOString());
  assert.strictEqual(body.deactivatedAt, null);
  for (const key of ['hashedPassword', 'mfaCode', 'mfaToken', '__data', '__fields', 'changes']) {
    assert.strictEqual(Object.hasOwn(body, key), false, `${key} must not be exposed`);
  }
});

test('API serialization still rejects a model missing a required response field', () => {
  const data = userData();
  delete data.email;

  assert.throws(() => userSerializer()(new User(data)), (error) => {
    assert.strictEqual(error.code, 'FST_ERR_RESPONSE_SERIALIZATION');
    assert.ok(error.cause.issues.some(issue => issue.path[0] === 'email'));
    return true;
  });
});
