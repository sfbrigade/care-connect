import { test, mock } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { build } from '#test/helper.js';
import location from '#lib/location.js';

test('/api/geocode/reverse', async (t) => {
  const app = await build(t);

  t.after(() => {
    mock.restoreAll();
  });

  await t.test('uses street + housenumber when available', async () => {
    mock.method(location, 'reverseGeocode', async () => ({
      addressLine1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
    }));

    const response = await app.inject()
      .get('/api/geocode/reverse?latitude=37.77&longitude=-122.41');

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data.addressLine1, '123 Main St');
    assert.deepStrictEqual(data.city, 'San Francisco');
    assert.deepStrictEqual(data.state, 'CA');
    assert.deepStrictEqual(data.postalCode, '94105');

    location.reverseGeocode.mock.restore();
  });

  await t.test('falls back to label when street is missing', async () => {
    mock.method(location, 'reverseGeocode', async () => ({
      addressLine1: 'Golden Gate Park, San Francisco, CA 94122',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94122',
    }));

    const response = await app.inject()
      .get('/api/geocode/reverse?latitude=37.77&longitude=-122.41');

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data.addressLine1, 'Golden Gate Park, San Francisco, CA 94122');
    assert.deepStrictEqual(data.city, 'San Francisco');
    assert.deepStrictEqual(data.state, 'CA');
    assert.deepStrictEqual(data.postalCode, '94122');

    location.reverseGeocode.mock.restore();
  });
});
