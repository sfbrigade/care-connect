import prisma from '#prisma/client.js';
import mailer from '#lib/mailer.js';
import DeflectionDocument from '#models/deflectionDocument.js';

const EMAIL_RECIPIENT = 'careconnect@sf.gov';

export default async function formsEmail (data, prismaClient = prisma) {
  const { deflectionId, formIds, template } = data;

  const deflection = await prismaClient.deflection.findUnique({
    where: { id: deflectionId },
    include: {
      subject: true,
      facility: true,
      deflectionDocuments: { where: { formId: { in: formIds } } },
      incident: { include: { createdBy: true } },
    },
  });
  if (!deflection) return;

  const emailAttachments = [];
  for (const doc of deflection.deflectionDocuments) {
    const document = new DeflectionDocument(doc);
    const filePath = await document.getAsset('file');
    emailAttachments.push({
      filename: doc.file,
      path: filePath,
    });
  }

  await mailer.send({
    template,
    message: {
      to: EMAIL_RECIPIENT,
      attachments: emailAttachments,
    },
    locals: {
      subjectName: `${deflection.subject.firstName} ${deflection.subject.lastName}`,
      officerName: `${deflection.incident.createdBy.firstName} ${deflection.incident.createdBy.lastName}`,
      facilityName: deflection.facility.name,
    },
  });
}
