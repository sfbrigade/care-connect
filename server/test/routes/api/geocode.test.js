import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { build } from '#test/helper.js';

test('/api/geocode/reverse', async (t) => {
  const app = await build(t);

  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.OPENROUTESERVICE_BASE_URL;
    delete process.env.OPENROUTESERVICE_API_KEY;
  });

  process.env.OPENROUTESERVICE_API_KEY = 'test-key';
  process.env.OPENROUTESERVICE_BASE_URL = 'https://api.openrouteservice.org/geocode/search';

  await t.test('uses street + housenumber when available', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              name: 'Coffee Shop',
              street: 'Main St',
              housenumber: '123',
              locality: 'San Francisco',
              region_a: 'CA',
              postalcode: '94105',
              label: '123 Main St, San Francisco, CA 94105',
            },
          },
        ],
      }),
    });

    const response = await app.inject()
      .get('/api/geocode/reverse?latitude=37.77&longitude=-122.41');

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data.addressLine1, '123 Main St');
    assert.deepStrictEqual(data.city, 'San Francisco');
    assert.deepStrictEqual(data.state, 'CA');
    assert.deepStrictEqual(data.postalCode, '94105');
  });

  await t.test('falls back to label when street is missing', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              name: 'Golden Gate Park',
              locality: 'San Francisco',
              region_a: 'CA',
              postalcode: '94122',
              label: 'Golden Gate Park, San Francisco, CA 94122',
            },
          },
        ],
      }),
    });

    const response = await app.inject()
      .get('/api/geocode/reverse?latitude=37.77&longitude=-122.41');

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data.addressLine1, 'Golden Gate Park, San Francisco, CA 94122');
    assert.deepStrictEqual(data.city, 'San Francisco');
    assert.deepStrictEqual(data.state, 'CA');
    assert.deepStrictEqual(data.postalCode, '94122');
  });
});
