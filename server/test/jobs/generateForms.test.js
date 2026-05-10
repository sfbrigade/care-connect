import { test, mock } from 'node:test';
import * as assert from 'node:assert';

import { build } from '#test/helper.js';

// Mock PDF generation to avoid needing Chromium locally
mock.module('#lib/forms/shared/renderReactForm.js', {
  namedExports: {
    renderFormToHtml: async () => '<html/>',
    renderFormToPdf: async () => Buffer.from('%PDF-mock'),
  },
});

test('generateForms 647f hash logic', async (t) => {
  const app = await build(t);
  const { prisma } = app;
  const { default: generateForms } = await import('../../jobs/generateForms.js');

  const facilityId = '6d123d8f-edd5-4d14-9220-0508eb30b47b';
  const bedTypeId = '2347510d-5fd0-4c5c-8a14-82bfd3ef2c76';

  async function createDeflection () {
    const user = await prisma.user.findFirst();
    const incident = await prisma.incident.create({
      data: {
        facilityId,
        encounteredVia: 'ON_VIEW',
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const deflection = await prisma.deflection.create({
      data: {
        incidentId: incident.id,
        facilityId,
        bedTypeId,
        createdById: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        status: 'ACTIVE',
        subjectStatus: 'DETAINED',
      },
    });
    return { user, deflection };
  }

  await t.test('first generation stores sourceDataHash', async () => {
    const { user, deflection } = await createDeflection();

    await generateForms(
      { deflectionId: deflection.id, userId: user.id, formIds: ['647f'] },
      prisma
    );

    const doc = await prisma.deflectionDocument.findUnique({
      where: { deflectionId_formId: { deflectionId: deflection.id, formId: '647f' } },
    });

    assert.ok(doc, 'document should be created');
    assert.ok(doc.sourceDataHash, 'sourceDataHash should be set');
  });

  await t.test('skips 647f when data has not changed', async () => {
    const { user, deflection } = await createDeflection();

    // First generation
    await generateForms(
      { deflectionId: deflection.id, userId: user.id, formIds: ['647f'] },
      prisma
    );

    const docAfterFirst = await prisma.deflectionDocument.findUnique({
      where: { deflectionId_formId: { deflectionId: deflection.id, formId: '647f' } },
    });
    const firstUpdatedAt = docAfterFirst.updatedAt;

    // Second generation with same data
    const result = await generateForms(
      { deflectionId: deflection.id, userId: user.id, formIds: ['647f'] },
      prisma
    );

    assert.deepStrictEqual(result.skippedFormIds, ['647f']);
    assert.deepStrictEqual(result.generatedFormIds, []);

    const docAfterSecond = await prisma.deflectionDocument.findUnique({
      where: { deflectionId_formId: { deflectionId: deflection.id, formId: '647f' } },
    });
    assert.strictEqual(
      docAfterSecond.updatedAt.getTime(),
      firstUpdatedAt.getTime(),
      'document should not have been updated'
    );
  });

  await t.test('regenerates 647f when data has changed', async () => {
    const { user, deflection } = await createDeflection();

    // First generation
    await generateForms(
      { deflectionId: deflection.id, userId: user.id, formIds: ['647f'] },
      prisma
    );

    const docAfterFirst = await prisma.deflectionDocument.findUnique({
      where: { deflectionId_formId: { deflectionId: deflection.id, formId: '647f' } },
    });
    const firstHash = docAfterFirst.sourceDataHash;

    // Change deflection data that feeds the 647f form
    await prisma.deflection.update({
      where: { id: deflection.id },
      data: { behavior: 'Subject was found intoxicated and unable to care for themselves' },
    });

    // Second generation with changed data
    const result = await generateForms(
      { deflectionId: deflection.id, userId: user.id, formIds: ['647f'] },
      prisma
    );

    assert.deepStrictEqual(result.skippedFormIds, []);
    assert.deepStrictEqual(result.generatedFormIds, ['647f']);

    const docAfterSecond = await prisma.deflectionDocument.findUnique({
      where: { deflectionId_formId: { deflectionId: deflection.id, formId: '647f' } },
    });
    assert.notStrictEqual(docAfterSecond.sourceDataHash, firstHash, 'hash should have changed');
  });

  await t.test('always regenerates existing 849b before e-mail attachments are sent', async () => {
    const { user, deflection } = await createDeflection();
    await prisma.deflection.update({
      where: { id: deflection.id },
      data: {
        subjectStatus: 'RELEASED',
        releasedAt: new Date(),
        releasedById: user.id,
      },
    });
    await prisma.deflectionDocument.create({
      data: {
        deflectionId: deflection.id,
        formId: '849b',
        file: 'stale-849b.pdf',
        createdById: user.id,
        updatedById: user.id,
      },
    });

    const result = await generateForms(
      { deflectionId: deflection.id, userId: user.id, formIds: ['849b'] },
      prisma
    );

    assert.deepStrictEqual(result.skippedFormIds, []);
    assert.deepStrictEqual(result.generatedFormIds, ['849b']);

    const docAfterRegeneration = await prisma.deflectionDocument.findUnique({
      where: { deflectionId_formId: { deflectionId: deflection.id, formId: '849b' } },
    });
    assert.strictEqual(docAfterRegeneration.file, `849b-report-${deflection.id}.pdf`);
    assert.strictEqual(docAfterRegeneration.sourceDataHash, null);
  });
});
