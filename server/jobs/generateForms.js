import { createHash } from 'node:crypto';

import prisma from '#prisma/client.js';
import { FORMS } from '#lib/forms/index.js';
import { LIVE_EMAIL_FORM_IDS } from '#lib/forms/liveEmailForms.js';
import { storeFormPdf } from '#lib/forms/storeFormPdf.js';

export default async function generateForms (data, prismaClient = prisma) {
  const { deflectionId, userId, formIds, emailTemplate } = data;

  const forms = formIds
    ? Object.fromEntries(Object.entries(FORMS).filter(([id]) =>
      formIds.includes(id) && !(emailTemplate && LIVE_EMAIL_FORM_IDS.has(id))
    ))
    : FORMS;

  const user = await prismaClient.user.findUnique({ where: { id: userId }, include: { unit: true } });

  const result = {
    skippedFormIds: [],
    generatedFormIds: [],
    updatedSinceTransferFormIds: [],
  };

  for (const [formId, form] of Object.entries(forms)) {
    const deflection = await prismaClient.deflection.findUnique({
      where: { id: deflectionId },
      include: form.deflectionInclude,
    });
    if (!deflection) return;

    const check = form.canGenerate(deflection);
    if (check !== true) {
      result.skippedFormIds.push(formId);
      continue;
    }

    const deflectionData = form.transformData(deflection);
    const dataHash = formId === '647f' ? createHash('sha256').update(JSON.stringify(deflectionData)).digest('hex') : null;
    const existing = await prismaClient.deflectionDocument.findUnique({
      where: { deflectionId_formId: { deflectionId, formId } },
    });
    if (
      formId === '647f' &&
      existing?.createdAt &&
      existing?.updatedAt &&
      deflection.transferredAt &&
      new Date(existing.updatedAt).getTime() > Math.max(
        new Date(deflection.transferredAt).getTime(),
        new Date(existing.createdAt).getTime()
      )
    ) {
      result.updatedSinceTransferFormIds.push(formId);
    }
    if (dataHash && existing?.sourceDataHash === dataHash) {
      result.skippedFormIds.push(formId);
      continue;
    }

    const pdfBuffer = await form.generatePdf(deflectionData, user);

    const filename = form.downloadFilename(deflectionId);
    await storeFormPdf(prismaClient, {
      deflectionId,
      formId,
      filename,
      content: pdfBuffer,
      userId,
      sourceDataHash: dataHash,
    });
    result.generatedFormIds.push(formId);
  }

  return result;
}
