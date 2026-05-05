import { test, mock } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

// Mock PDF generation before any imports reach the real renderReactForm.js —
// avoids needing Chromium in CI and keeps assertions focused on route wiring.
// The actual renderFormToPdf rendering is an E2E / deployment smoke-test concern.
mock.module('#lib/forms/shared/renderReactForm.js', {
  namedExports: {
    renderFormToPdf: async () => Buffer.from('%PDF-mock'),
  },
});

test('/api/forms', async (t) => {
  const app = await build(t);
  const userHeaders = await authenticate(app, 'regular.user@test.com', 'test');

  // Look up fixture deflections dynamically so tests are resilient to
  // fixture ordering changes.  The releasedDeflection fixture is the only
  // one with releasedAt set; all others have releasedAt = null.
  const releasedDeflection = await app.prisma.deflection.findFirst({
    where: { releasedAt: { not: null } },
  });
  assert.ok(releasedDeflection, 'fixture: a releasedDeflection must exist');

  const unreleasedDeflection = await app.prisma.deflection.findFirst({
    where: { releasedAt: null },
    orderBy: { id: 'asc' },
  });
  assert.ok(unreleasedDeflection, 'fixture: an unreleased deflection must exist');

  // ---------------------------------------------------------------------------
  // /pdf endpoint tests — Chromium mocked, verifies route wiring only.
  // canGenerate() guards are exercised for each form.
  // ---------------------------------------------------------------------------

  await t.test('GET /647f/pdf/:deflectionId', async (t) => {
    // canGenerate() always returns true for 647f — any deflection qualifies.

    await t.test('redirects to a signed URL for the stored asset', async () => {
      const response = await app.inject()
        .get(`/api/forms/647f/pdf/${unreleasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.MOVED_TEMPORARILY);
      assert.match(
        response.headers.location,
        new RegExp(`deflection_documents/[a-f0-9-]+/file/647f-report-${unreleasedDeflection.id}\\.pdf`)
      );
    });

    await t.test('returns 404 for a non-existent deflection', async () => {
      const response = await app.inject()
        .get('/api/forms/647f/pdf/999999')
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get(`/api/forms/647f/pdf/${unreleasedDeflection.id}`);
      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('GET /cert/pdf/:deflectionId', async (t) => {
    // canGenerate() requires releasedAt to be set.

    await t.test('redirects to a signed URL for a released deflection', async () => {
      const response = await app.inject()
        .get(`/api/forms/cert/pdf/${releasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.MOVED_TEMPORARILY);
      assert.match(
        response.headers.location,
        new RegExp(`deflection_documents/[a-f0-9-]+/file/cert-${releasedDeflection.id}\\.pdf`)
      );
    });

    await t.test('returns 422 when canGenerate() fails because deflection has not been released', async () => {
      const response = await app.inject()
        .get(`/api/forms/cert/pdf/${unreleasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get(`/api/forms/cert/pdf/${releasedDeflection.id}`);
      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('GET /849b/pdf/:deflectionId', async (t) => {
    // canGenerate() requires releasedAt to be set.

    await t.test('redirects to a signed URL for a released deflection', async () => {
      const response = await app.inject()
        .get(`/api/forms/849b/pdf/${releasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.MOVED_TEMPORARILY);
      assert.match(
        response.headers.location,
        new RegExp(`deflection_documents/[a-f0-9-]+/file/849b-report-${releasedDeflection.id}\\.pdf`)
      );
    });

    await t.test('returns 422 when canGenerate() fails because deflection has not been released', async () => {
      const response = await app.inject()
        .get(`/api/forms/849b/pdf/${unreleasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get(`/api/forms/849b/pdf/${releasedDeflection.id}`);
      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('redirects to the same stored asset regardless of requesting user', async () => {
      // Attribution must come from the deflection record (releasedBy), not
      // the session user. Verify by hitting the same URL as two different
      // authenticated users and confirming both redirect to the same
      // DeflectionDocument asset path.
      const adminHeaders = await authenticate(app, 'admin.user@test.com', 'test');

      const r1 = await app.inject()
        .get(`/api/forms/849b/pdf/${releasedDeflection.id}`)
        .headers(userHeaders);
      const r2 = await app.inject()
        .get(`/api/forms/849b/pdf/${releasedDeflection.id}`)
        .headers(adminHeaders);

      assert.strictEqual(r1.statusCode, StatusCodes.MOVED_TEMPORARILY);
      assert.strictEqual(r2.statusCode, StatusCodes.MOVED_TEMPORARILY);

      const assetPathRegex = new RegExp(`(deflection_documents/[a-f0-9-]+/file/849b-report-${releasedDeflection.id}\\.pdf)`);
      const m1 = r1.headers.location.match(assetPathRegex);
      const m2 = r2.headers.location.match(assetPathRegex);
      assert.ok(m1, 'first response must include the asset path');
      assert.ok(m2, 'second response must include the asset path');
      assert.strictEqual(m1[1], m2[1]);
    });
  });
});
