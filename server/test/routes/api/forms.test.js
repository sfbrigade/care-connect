import { test, mock } from 'node:test';
import * as assert from 'node:assert';
import { StatusCodes } from 'http-status-codes';

import { authenticate, build } from '#test/helper.js';

// Mock PDF generation before any imports reach the real renderReactForm.js —
// avoids needing Chromium in CI and keeps assertions focused on route wiring.
// The actual renderToPdf rendering is an E2E / deployment smoke-test concern.
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
  // /data endpoint tests — full integration (no Chromium needed)
  // canGenerate() is exercised through the route handler for each form.
  // ---------------------------------------------------------------------------

  await t.test('GET /647f/data/:deflectionId', async (t) => {
    // Form647f.canGenerate() always returns true — no release precondition.

    await t.test('returns form data for an unreleased deflection', async () => {
      const response = await app.inject()
        .get(`/api/forms/647f/data/${unreleasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.strictEqual(typeof data.deflectionId, 'number');
    });

    await t.test('returns form data even when deflection is already released', async () => {
      const response = await app.inject()
        .get(`/api/forms/647f/data/${releasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);
    });

    await t.test('returns 404 for a non-existent deflection', async () => {
      const response = await app.inject()
        .get('/api/forms/647f/data/999999')
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get(`/api/forms/647f/data/${unreleasedDeflection.id}`);
      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });

    await t.test('prefers the arresting officer badge number from IncidentOfficer records', async () => {
      const deflection = await app.prisma.deflection.findFirst({
        where: { releasedAt: null },
        include: { incident: true },
      });
      assert.ok(deflection?.incident, 'fixture: an unreleased deflection with incident must exist');

      await app.prisma.incident.update({
        where: { id: deflection.incident.id },
        data: {
          createdByBadgeNumber: null,
        },
      });

      await app.prisma.incidentOfficer.create({
        data: {
          incidentId: deflection.incident.id,
          facilityId: deflection.facilityId,
          officerId: deflection.incident.createdById,
          role: 'ARRESTING',
          badgeNumber: '4321',
          organizationId: 'sfpd',
        },
      });

      const response = await app.inject()
        .get(`/api/forms/647f/data/${deflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.strictEqual(data.officerBadge, '4321');
    });

    await t.test('includes the supervising sergeant star number from the incident', async () => {
      const deflection = await app.prisma.deflection.findFirst({
        where: { releasedAt: null },
        include: { incident: true },
      });
      assert.ok(deflection?.incident, 'fixture: an unreleased deflection with incident must exist');

      await app.prisma.incident.update({
        where: { id: deflection.incident.id },
        data: {
          supervisorBadgeNumber: '9876',
        },
      });

      const response = await app.inject()
        .get(`/api/forms/647f/data/${deflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);

      const data = JSON.parse(response.body);
      assert.strictEqual(data.supervisorBadgeNumber, '9876');
    });
  });

  await t.test('GET /cert/data/:deflectionId', async (t) => {
    // FormCoR.canGenerate() requires releasedAt to be set.

    await t.test('returns form data for a released deflection', async () => {
      const response = await app.inject()
        .get(`/api/forms/cert/data/${releasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(data.releaseDate, 'releaseDate should be present');
      assert.strictEqual(typeof data.subjectName, 'string');
    });

    await t.test('returns 422 when canGenerate() fails because deflection has not been released', async () => {
      const response = await app.inject()
        .get(`/api/forms/cert/data/${unreleasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      const body = JSON.parse(response.body);
      assert.ok(body.error, 'error message should be present');
    });

    await t.test('returns 404 for a non-existent deflection', async () => {
      const response = await app.inject()
        .get('/api/forms/cert/data/999999')
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get(`/api/forms/cert/data/${releasedDeflection.id}`);
      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  await t.test('GET /849b/data/:deflectionId', async (t) => {
    // Form849b.canGenerate() requires releasedAt to be set.

    await t.test('returns form data for a released deflection', async () => {
      const response = await app.inject()
        .get(`/api/forms/849b/data/${releasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);
      const data = JSON.parse(response.body);
      assert.ok(data.releasedAt, 'releasedAt should be present');
    });

    await t.test('returns 422 when canGenerate() fails because deflection has not been released', async () => {
      const response = await app.inject()
        .get(`/api/forms/849b/data/${unreleasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.UNPROCESSABLE_ENTITY);
      const body = JSON.parse(response.body);
      assert.ok(body.error, 'error message should be present');
    });

    await t.test('returns 404 for a non-existent deflection', async () => {
      const response = await app.inject()
        .get('/api/forms/849b/data/999999')
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.NOT_FOUND);
    });

    await t.test('requires authentication', async () => {
      const response = await app.inject()
        .get(`/api/forms/849b/data/${releasedDeflection.id}`);
      assert.strictEqual(response.statusCode, StatusCodes.UNAUTHORIZED);
    });
  });

  // ---------------------------------------------------------------------------
  // /pdf endpoint tests — Chromium mocked, verifies route wiring only.
  // canGenerate() guards are exercised for each form.
  // ---------------------------------------------------------------------------

  await t.test('GET /647f/pdf/:deflectionId', async (t) => {
    // canGenerate() always returns true for 647f — any deflection qualifies.

    await t.test('returns a PDF with correct headers', async () => {
      const response = await app.inject()
        .get(`/api/forms/647f/pdf/${unreleasedDeflection.id}`)
        .headers(userHeaders);
      assert.strictEqual(response.statusCode, StatusCodes.OK);
      assert.strictEqual(response.headers['content-type'], 'application/pdf');
      assert.match(
        response.headers['content-disposition'],
        new RegExp(`647f-report-${unreleasedDeflection.id}\\.pdf`)
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
