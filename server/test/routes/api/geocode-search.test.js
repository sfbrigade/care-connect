import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';
import location from '#lib/location.js';

test('/api/geocode/search', async (t) => {
  const app = await build(t);

  let originalSuggest;
  t.before(() => {
    originalSuggest = location.suggest;
  });
  t.after(() => {
    location.suggest = originalSuggest;
  });

  await t.test('returns 401 without authentication', async () => {
    const response = await app.inject()
      .get('/api/geocode/search?text=123+Main');

    assert.deepStrictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
  });

  await t.test('returns 400 when text param is missing', async () => {
    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/search')
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
  });

  await t.test('maps AWS Suggest response to address fields', async () => {
    location.suggest = async () => ({
      ResultItems: [
        {
          SuggestResultItemType: 'Place',
          Title: '323 Eureka St, San Francisco, CA 94114',
          Place: {
            PlaceId: 'abc123',
            Address: {
              Label: '323 Eureka St, San Francisco, CA 94114, United States',
              AddressNumber: '323',
              Street: 'Eureka St',
              Locality: 'San Francisco',
              Region: { Code: 'CA' },
              PostalCode: '94114',
              District: 'Castro',
            },
            Position: [-122.4360, 37.7610],
          },
        },
      ],
    });

    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/search?text=323+Eureka')
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data.length, 1);
    assert.deepStrictEqual(data[0], {
      placeId: 'abc123',
      label: '323 Eureka St, San Francisco, CA 94114, United States',
      addressLine1: '323 Eureka St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94114',
      neighborhood: 'Castro',
      latitude: 37.7610,
      longitude: -122.4360,
    });
  });

  await t.test('filters out non-Place result types', async () => {
    location.suggest = async () => ({
      ResultItems: [
        {
          SuggestResultItemType: 'Query',
          Title: 'restaurants near 323 Eureka',
          Query: { QueryId: 'query-1' },
        },
        {
          SuggestResultItemType: 'Place',
          Title: '323 Eureka St',
          Place: {
            PlaceId: 'abc123',
            Address: {
              Label: '323 Eureka St, San Francisco, CA 94114',
              AddressNumber: '323',
              Street: 'Eureka St',
              Locality: 'San Francisco',
              Region: { Code: 'CA' },
              PostalCode: '94114',
            },
            Position: [-122.4360, 37.7610],
          },
        },
      ],
    });

    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/search?text=323+Eureka')
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data.length, 1);
    assert.deepStrictEqual(data[0].placeId, 'abc123');
  });

  await t.test('handles missing optional address fields', async () => {
    location.suggest = async () => ({
      ResultItems: [
        {
          SuggestResultItemType: 'Place',
          Title: 'Some Place',
          Place: {
            PlaceId: 'xyz789',
            Address: {
              AddressNumber: '100',
              Street: 'Market St',
            },
            Position: [-122.42, 37.78],
          },
        },
      ],
    });

    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/search?text=100+Market')
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data[0].addressLine1, '100 Market St');
    assert.deepStrictEqual(data[0].label, 'Some Place');
    assert.deepStrictEqual(data[0].city, null);
    assert.deepStrictEqual(data[0].state, null);
    assert.deepStrictEqual(data[0].postalCode, null);
    assert.deepStrictEqual(data[0].neighborhood, null);
  });

  await t.test('handles missing Position', async () => {
    location.suggest = async () => ({
      ResultItems: [
        {
          SuggestResultItemType: 'Place',
          Title: '500 Castro St',
          Place: {
            PlaceId: 'no-pos',
            Address: {
              Label: '500 Castro St, San Francisco, CA',
              AddressNumber: '500',
              Street: 'Castro St',
            },
          },
        },
      ],
    });

    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/search?text=500+Castro')
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data[0].latitude, null);
    assert.deepStrictEqual(data[0].longitude, null);
  });

  await t.test('returns empty array when no results', async () => {
    location.suggest = async () => ({
      ResultItems: [],
    });

    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/search?text=zzzzzzzzz')
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.OK);
    const data = JSON.parse(response.body);
    assert.deepStrictEqual(data, []);
  });

  await t.test('returns 500 when AWS SDK throws', async () => {
    location.suggest = async () => {
      throw new Error('AWS credentials invalid');
    };

    const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');
    const response = await app.inject()
      .get('/api/geocode/search?text=123+Main')
      .headers(userHeaders);

    assert.deepStrictEqual(response.statusCode, StatusCodes.INTERNAL_SERVER_ERROR);
  });
});
