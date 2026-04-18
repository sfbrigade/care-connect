import { createHash } from 'node:crypto';

import prisma from '#prisma/client.js';
import { FORMS } from '#lib/forms/index.js';
import DeflectionDocument from '#models/deflectionDocument.js';

export default async function generateForms (data, prismaClient = prisma) {
  const { deflectionId, userId, formIds } = data;

  const forms = formIds
    ? Object.fromEntries(Object.entries(FORMS).filter(([id]) => formIds.includes(id)))
    : FORMS;

  const user = await prismaClient.user.findUnique({ where: { id: userId }, include: { unit: true } });

  const skippedFormIds = [];

  for (const [formId, form] of Object.entries(forms)) {
    const deflection = await prismaClient.deflection.findUnique({
      where: { id: deflectionId },
      include: form.deflectionInclude,
    });
    if (!deflection) return;

    const check = form.canGenerate(deflection);
    if (check !== true) {
      skippedFormIds.push(formId);
      continue;
    }

    const deflectionData = form.transformData(deflection);
    const dataHash = createHash('sha256').update(JSON.stringify(deflectionData)).digest('hex');
    const existing = await prismaClient.deflectionDocument.findUnique({
      where: { deflectionId_formId: { deflectionId: deflection.id, formId } },
    });
    if (existing?.sourceDataHash === dataHash) {
      skippedFormIds.push(formId);
      continue;
    }

    const pdfBuffer = await form.generatePdf(deflectionData, user);

    const filename = form.downloadFilename(deflectionId);

    if (existing) {
      const doc = new DeflectionDocument(existing);
      const assetHandler = doc.setAsset('file', filename, { buffer: pdfBuffer });
      await prismaClient.deflectionDocument.update({
        where: { id: existing.id },
        data: { file: filename, updatedById: userId, ...(dataHash && { sourceDataHash: dataHash }) },
      });
      await assetHandler();
    } else {
      const doc = new DeflectionDocument({ formId, deflectionId });
      const assetHandler = doc.setAsset('file', filename, { buffer: pdfBuffer });
      const record = await prismaClient.deflectionDocument.create({
        data: {
          deflectionId,
          formId,
          file: filename,
          createdById: userId,
          updatedById: userId,
          ...(dataHash && { sourceDataHash: dataHash }),
        },
      });
      await assetHandler({ id: record.id });
    }
  }

  return skippedFormIds;
}
