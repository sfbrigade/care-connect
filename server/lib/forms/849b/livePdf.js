import { FORMS } from '#lib/forms/index.js';
import { storeFormPdf } from '#lib/forms/storeFormPdf.js';

export async function generateLive849bPdf (prismaClient, deflectionId) {
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

  const content = await form.generatePdf(form.transformData(deflection));
  return {
    status: 'ok',
    deflection,
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
