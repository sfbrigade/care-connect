import prisma from '#prisma/client.js';
import mailer from '#lib/mailer.js';
import DeflectionDocument from '#models/deflectionDocument.js';

const EMAIL_RECIPIENT = 'careconnect@sfgov.org';
const INCIDENT_REPORTS_RECIPIENT = 'Sfso-incidentreports@sfgov.org';
const SWAPSUPS_RECIPIENT = 'sfso-swapsups@sfgov.org';
const TRANSFER_RECIPIENTS = [
  'SFPD.Data.Transfer.Authorized@sfgov.org',
  'Andrew.bley@sfgov.org',
  INCIDENT_REPORTS_RECIPIENT,
];

export default async function formsEmail (data, prismaClient = prisma) {
  const { deflectionId, formIds, template, recipientEmail, userId } = data;

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
      formId: doc.formId,
      filename: doc.file,
      path: filePath,
    });
  }

  const sendingUser = userId
    ? await prismaClient.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    : null;
  const arrestingOfficerEmail = deflection.incident?.createdBy?.email || null;

  function uniqueEmails (emails) {
    return [...new Set(emails.filter(Boolean))];
  }

  async function sendFormsMessage ({ targetFormIds, to, cc = [] }) {
    const attachments = emailAttachments
      .filter((attachment) => targetFormIds.includes(attachment.formId))
      .map(({ filename, path }) => ({ filename, path }));

    if (attachments.length === 0) return;

    await mailer.send({
      template,
      message: {
        to,
        ...(cc.length > 0 && { cc }),
        attachments,
      },
      locals: {
        subjectName: `${deflection.subject.firstName} ${deflection.subject.lastName}`,
        officerName: `${deflection.incident.createdBy.firstName} ${deflection.incident.createdBy.lastName}`,
        facilityName: deflection.facility.name,
      },
    });
  }

  function was647fRegeneratedSinceTransfer () {
    const doc647f = deflection.deflectionDocuments.find((doc) => doc.formId === '647f');
    if (!doc647f || !deflection.transferredAt) return false;

    const baseline = Math.max(
      new Date(deflection.transferredAt).getTime(),
      new Date(doc647f.createdAt).getTime()
    );

    return new Date(doc647f.updatedAt).getTime() > baseline;
  }

  if (template === 'release-forms') {
    await sendFormsMessage({
      targetFormIds: formIds,
      to: [
        SWAPSUPS_RECIPIENT,
        sendingUser?.email || recipientEmail,
      ].filter(Boolean),
    });

    if (formIds.includes('647f') && was647fRegeneratedSinceTransfer()) {
      await mailer.send({
        template: 'transfer-form',
        message: {
          to: uniqueEmails([...TRANSFER_RECIPIENTS, arrestingOfficerEmail]),
          attachments: emailAttachments
            .filter((attachment) => attachment.formId === '647f')
            .map(({ filename, path }) => ({ filename, path })),
        },
        locals: {
          subjectName: `${deflection.subject.firstName} ${deflection.subject.lastName}`,
          officerName: `${deflection.incident.createdBy.firstName} ${deflection.incident.createdBy.lastName}`,
          facilityName: deflection.facility.name,
        },
      });
    }

    return;
  }

  if (formIds.includes('849b')) {
    await sendFormsMessage({
      targetFormIds: ['849b'],
      to: [
        SWAPSUPS_RECIPIENT,
        sendingUser?.email || recipientEmail,
      ].filter(Boolean),
    });
  }

  const remainingFormIds = formIds.filter((formId) => formId !== '849b');
  if (remainingFormIds.length > 0) {
    const cc = [];
    let to = recipientEmail || EMAIL_RECIPIENT;
    if (remainingFormIds.includes('647f') && Array.isArray(recipientEmail) && template === 'transfer-form') {
      to = uniqueEmails([...recipientEmail, arrestingOfficerEmail]);
    } else if (remainingFormIds.includes('647f') && !recipientEmail) {
      if (arrestingOfficerEmail) cc.push(arrestingOfficerEmail);
      cc.push(INCIDENT_REPORTS_RECIPIENT);
    }

    await sendFormsMessage({
      targetFormIds: remainingFormIds,
      to,
      cc,
    });
  }
}
