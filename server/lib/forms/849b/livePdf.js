import { FORMS } from '#lib/forms/index.js';
import { storeFormPdf } from '#lib/forms/storeFormPdf.js';

export async function validateLive849bPdf (prismaClient, deflectionId) {
  const form = FORMS['849b'];
  const deflection = await prismaClient.deflection.findUnique({
    where: { id: deflectionId },
    include: {
      ...form.deflectionInclude,
      facility: true,
    },
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

export async function generateLive849bPdf (prismaClient, deflectionId) {
  const validation = await validateLive849bPdf(prismaClient, deflectionId);
  if (validation.status !== 'ok') return validation;

  const form = FORMS['849b'];
  const content = await form.generatePdf(form.transformData(validation.deflection));
  return {
    status: 'ok',
    deflection: validation.deflection,
    attachment: {
      formId: '849b',
      filename: form.downloadFilename(deflectionId),
      content,
    },
  };
}

export async function storeLive849bPdf (prismaClient, { deflectionId, userId, content, filename }) {
  await storeFormPdf(prismaClient, {
    deflectionId,
    formId: '849b',
    filename,
    content,
    userId,
  });
}
