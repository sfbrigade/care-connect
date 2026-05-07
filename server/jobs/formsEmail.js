import prisma from '#prisma/client.js';
import mailer from '#lib/mailer.js';
import { generateLive849bPdf, storeLive849bPdf } from '#lib/forms/849b/livePdf.js';
import DeflectionDocument from '#models/deflectionDocument.js';
import { captureException } from '#lib/posthog.js';

const EMAIL_RECIPIENT = 'careconnect@sfgov.org';
const INCIDENT_REPORTS_RECIPIENT = 'Sfso-incidentreports@sfgov.org';
const SWAPSUPS_RECIPIENT = 'sfso-swapsups@sfgov.org';
const TRANSFER_RECIPIENTS = [
  'SFPD.Data.Transfer.Authorized@sfgov.org',
  'Andrew.bley@sfgov.org',
  INCIDENT_REPORTS_RECIPIENT,
];

export default async function formsEmail (data, prismaClient = prisma) {
  const { deflectionId, formIds, template, recipientEmail, userId, regeneratedFormIds = [] } = data;
  let live849bAttachment = null;

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
  if (formIds.includes('849b')) {
    const live849b = await generateLive849bPdf(prismaClient, deflectionId);
    if (live849b.status !== 'ok') {
      throw new Error(`Live 849(b) generation failed for deflection ${deflectionId}: ${live849b.status}${live849b.error ? ` (${live849b.error})` : ''}`);
    }
    live849bAttachment = live849b.attachment;
    emailAttachments.push(live849bAttachment);
  }

  for (const doc of deflection.deflectionDocuments) {
    if (doc.formId === '849b') continue;
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
      .map(({ filename, path, content }) => ({
        filename,
        ...(path ? { path } : { content }),
      }));

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

    if (live849bAttachment && targetFormIds.includes('849b')) {
      // Storage of the audit copy must not block delivery: the email has
      // already gone out. Surface failures via logs + PostHog instead so
      // missing audit records are noticeable.
      await storeLive849bPdf(prismaClient, {
        deflectionId,
        userId,
        content: live849bAttachment.content,
        filename: live849bAttachment.filename,
      }).catch((error) => {
        console.error(JSON.stringify({
          event: '849b/store-failed',
          deflectionId,
          template,
          error: error.message,
        }));
        captureException(error, 'care-connect-worker', {
          event: '849b/store-failed',
          deflectionId,
          template,
        });
      });
    }
  }

  if (template === 'release-forms') {
    await sendFormsMessage({
      targetFormIds: formIds,
      to: [
        SWAPSUPS_RECIPIENT,
        sendingUser?.email || recipientEmail,
      ].filter(Boolean),
    });

    if (formIds.includes('647f') && regeneratedFormIds.includes('647f')) {
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

  if (template === 'self-849b') {
    await sendFormsMessage({
      targetFormIds: ['849b'],
      to: sendingUser?.email || recipientEmail,
    });
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
