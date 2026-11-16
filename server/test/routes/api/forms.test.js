import { test } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

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

  const transferredDeflection = await app.prisma.deflection.update({
    where: { id: unreleasedDeflection.id },
    data: {
      subjectStatus: 'AWAITING_INTAKE',
      transferredAt: new Date(),
    },
  });

  // ---------------------------------------------------------------------------
  // /pdf endpoint tests — pure pdf-lib generation, no browser.
  // canGenerate() guards are exercised for each form.
  // ---------------------------------------------------------------------------

  await t.test('GET /647f/pdf/:deflectionId', async (t) => {
    // canGenerate() requires transferredAt to be set.

    await t.test('returns a PDF with correct headers', async () => {
      const response = await app.inject()
        .get(`/api/forms/647f/pdf/${transferredDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);
      assert.strictEqual(response.headers['content-type'], 'application/pdf');
      assert.match(
        response.headers['content-disposition'],
        new RegExp(`647f-report-${transferredDeflection.id}\\.pdf`)
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
        .get(`/api/forms/647f/pdf/${transferredDeflection.id}`);
      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('GET /cert/pdf/:deflectionId', async (t) => {
    // canGenerate() requires releasedAt to be set.

    await t.test('returns a PDF with correct headers for a released deflection', async () => {
      const response = await app.inject()
        .get(`/api/forms/cert/pdf/${releasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);
      assert.strictEqual(response.headers['content-type'], 'application/pdf');
      assert.match(
        response.headers['content-disposition'],
        new RegExp(`cert-${releasedDeflection.id}\\.pdf`)
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

    await t.test('appends the narcotics notice page when contraband was seized', async () => {
      await app.prisma.deflection.update({
        where: { id: releasedDeflection.id },
        data: { narcoticsSubstance: true, narcoticsParaphernalia: false },
      });

      const response = await app.inject()
        .get(`/api/forms/cert/pdf/${releasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);

      // The base certificate is one page; the pdf-lib notice appends a second.
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(response.rawPayload);
      assert.strictEqual(doc.getPageCount(), 2, 'notice page should be appended');
    });
  });

  await t.test('GET /849b/pdf/:deflectionId', async (t) => {
    // canGenerate() requires releasedAt to be set.

    await t.test('returns a PDF with correct headers for a released deflection', async () => {
      const response = await app.inject()
        .get(`/api/forms/849b/pdf/${releasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);
      assert.strictEqual(response.headers['content-type'], 'application/pdf');
      assert.match(
        response.headers['content-disposition'],
        new RegExp(`849b-report-${releasedDeflection.id}\\.pdf`)
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
  });
});
