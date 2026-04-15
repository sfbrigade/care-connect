import prisma from '#prisma/client.js';
import { FORMS } from '#lib/forms/index.js';
import DeflectionDocument from '#models/deflectionDocument.js';

export default async function generateForms (data, prismaClient = prisma) {
  const { deflectionId, userId, formIds } = data;

  const forms = formIds
    ? Object.fromEntries(Object.entries(FORMS).filter(([id]) => formIds.includes(id)))
    : FORMS;

  const user = await prismaClient.user.findUnique({ where: { id: userId } });

  for (const [formId, form] of Object.entries(forms)) {
    const deflection = await prismaClient.deflection.findUnique({
      where: { id: deflectionId },
      include: form.deflectionInclude,
    });
    if (!deflection) return;

    const check = form.canGenerate(deflection);
    if (check !== true) continue;

    const pdfBuffer = await form.generatePdf(deflection, user);

    const filename = form.downloadFilename(deflectionId);

    const existing = await prismaClient.deflectionDocument.findUnique({
      where: { deflectionId_formId: { deflectionId, formId } },
    });

    if (existing) {
      const doc = new DeflectionDocument(existing);
      const assetHandler = doc.setAsset('file', filename, { buffer: pdfBuffer });
      await prismaClient.deflectionDocument.update({
        where: { id: existing.id },
        data: { file: filename, updatedById: userId },
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
        },
      });
      await assetHandler({ id: record.id });
    }
  }
}
