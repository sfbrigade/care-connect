import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

test('/api/geocode/intersections', async (t) => {
  const app = await build(t);

  await t.test('returns 401 without authentication', async () => {
    const response = await app.inject()
      .get('/api/geocode/intersections?text=16th+%26+Valencia');
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('returns 400 when text param is missing', async () => {
    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/intersections')
      .headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
  });

  await t.test('returns intersection matches for a valid cross-street query', async () => {
    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/intersections?text=16th+%26+Valencia')
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 1, 'expected at least one match');
    const hit = data.find(r => r.street1 === '16TH ST' && r.street2 === 'VALENCIA ST');
    assert.ok(hit, '16TH ST × VALENCIA ST should be in results');
    assert.deepStrictEqual(hit.label, '16th St & Valencia St');
    assert.ok(typeof hit.latitude === 'number');
    assert.ok(typeof hit.longitude === 'number');
  });

  await t.test('returns empty array for a non-cross-street query', async () => {
    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/intersections?text=425+16th+St')
      .headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    assert.deepStrictEqual(JSON.parse(response.body), []);
  });

  await t.test('handles "and" connector', async () => {
    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/intersections?text=Junipero+Serra+and+Monterey')
      .headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.ok(data.some(r => r.label.includes('Junipero Serra')), 'expected Junipero Serra match');
  });

  await t.test('respects limit param', async () => {
    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/intersections?text=Fell+%26+Stanyan&limit=1')
      .headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.ok(data.length <= 1);
  });
});

test('/api/geocode/intersections/nearest', async (t) => {
  const app = await build(t);

  await t.test('returns 401 without authentication', async () => {
    const response = await app.inject()
      .get('/api/geocode/intersections/nearest?latitude=37.76492&longitude=-122.42189');
    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('returns N nearest intersections ordered by distance', async () => {
    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/intersections/nearest?latitude=37.76492&longitude=-122.42189&n=3')
      .headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data.length, 3);
    // First result should be the exact 16th & Valencia intersection.
    assert.deepStrictEqual(data[0].cnn, '24183000');
    // Distances should be monotonically increasing.
    assert.ok(data[0].distanceMeters <= data[1].distanceMeters);
    assert.ok(data[1].distanceMeters <= data[2].distanceMeters);
  });

  await t.test('defaults to n=2 when not specified', async () => {
    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/intersections/nearest?latitude=37.76492&longitude=-122.42189')
      .headers(userHeaders);
    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    assert.deepStrictEqual(JSON.parse(response.body).length, 2);
  });
});
