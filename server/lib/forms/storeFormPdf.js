import DeflectionDocument from '#models/deflectionDocument.js';

export async function storeFormPdf (prismaClient, {
  deflectionId,
  formId,
  filename,
  content,
  userId,
  sourceDataHash,
}) {
  if (!prismaClient.deflectionDocument || !userId) return;

  const existing = await prismaClient.deflectionDocument.findUnique({
    where: { deflectionId_formId: { deflectionId, formId } },
  });

  if (existing) {
    const doc = new DeflectionDocument(existing);
    const assetHandler = doc.setAsset('file', filename, { buffer: content });
    await prismaClient.deflectionDocument.update({
      where: { id: existing.id },
      data: {
        file: filename,
        updatedById: userId,
        ...(sourceDataHash && { sourceDataHash }),
      },
    });
    await assetHandler();
    return;
  }

  const doc = new DeflectionDocument({ formId, deflectionId });
  const assetHandler = doc.setAsset('file', filename, { buffer: content });
  const record = await prismaClient.deflectionDocument.create({
    data: {
      deflectionId,
      formId,
      file: filename,
      createdById: userId,
      updatedById: userId,
      ...(sourceDataHash && { sourceDataHash }),
    },
  });
  await assetHandler({ id: record.id });
}
