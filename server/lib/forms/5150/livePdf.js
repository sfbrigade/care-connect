import { FORMS } from '#lib/forms/index.js';
import { storeFormPdf } from '#lib/forms/storeFormPdf.js';

export async function validateLive5150Pdf (prismaClient, deflectionId) {
  const form = FORMS['5150'];
  const deflection = await prismaClient.deflection.findUnique({
    where: { id: deflectionId },
    include: form.deflectionInclude,
  });

  if (!deflection) {
    return { status: 'not_found' };
  }

  const check = form.canGenerate(deflection);
  if (check !== true) {
    return { status: 'unprocessable', error: check.message, deflection };
  }

  return { status: 'ok', deflection };
}

export async function generateLive5150Pdf (prismaClient, deflectionId) {
  const validation = await validateLive5150Pdf(prismaClient, deflectionId);
  if (validation.status !== 'ok') return validation;

  const form = FORMS['5150'];
  const content = await form.generatePdf(form.transformData(validation.deflection));
  return {
    status: 'ok',
    deflection: validation.deflection,
    attachment: {
      formId: '5150',
      filename: form.downloadFilename(deflectionId),
      content,
    },
  };
}

export async function storeLive5150Pdf (prismaClient, { deflectionId, userId, content, filename }) {
  await storeFormPdf(prismaClient, {
    deflectionId,
    formId: '5150',
    filename,
    content,
    userId,
  });
}
