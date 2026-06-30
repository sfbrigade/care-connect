import prisma from '#prisma/client.js';
import mailer from '#lib/mailer.js';
import { generateLive849bPdf, storeLive849bPdf } from '#lib/forms/849b/livePdf.js';
import { generateLive5150Pdf, storeLive5150Pdf } from '#lib/forms/5150/livePdf.js';
import DeflectionDocument from '#models/deflectionDocument.js';
import { captureException } from '#lib/posthog.js';

const EMAIL_RECIPIENT = process.env.EMAIL_FORMS_RECIPIENT_OVERRIDE || 'careconnect@sfgov.org';
const SWAPSUPS_RECIPIENT = process.env.EMAIL_FORMS_RECIPIENT_OVERRIDE || 'sfso-swapsups@sfgov.org';
const TRANSFER_RECIPIENTS = process.env.EMAIL_FORMS_RECIPIENT_OVERRIDE
  ? [process.env.EMAIL_FORMS_RECIPIENT_OVERRIDE]
  : [
      'SFPD.Data.Transfer.Authorized@sfgov.org',
      'Andrew.bley@sfgov.org',
    ];

export default async function formsEmail (data, prismaClient = prisma) {
  const { deflectionId, formIds, template, recipientEmail, userId, regeneratedFormIds = [] } = data;
  let live849bAttachment = null;
  let live5150Attachment = null;

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
  // Track form IDs we already live-generated this run so the persisted-document
  // loop below doesn't re-attach the same form a second time. (Without this,
  // a release packet that follows an earlier email would attach both the
  // freshly-generated PDF and the stored copy from the prior send.)
  const liveGeneratedFormIds = new Set();
  if (formIds.includes('849b')) {
    const live849b = await generateLive849bPdf(prismaClient, deflectionId);
    if (live849b.status !== 'ok') {
      throw new Error(`Live 849(b) generation failed for deflection ${deflectionId}: ${live849b.status}${live849b.error ? ` (${live849b.error})` : ''}`);
    }
    live849bAttachment = live849b.attachment;
    emailAttachments.push(live849bAttachment);
    liveGeneratedFormIds.add('849b');
  }
  if (formIds.includes('5150')) {
    const live5150 = await generateLive5150Pdf(prismaClient, deflectionId);
    if (live5150.status === 'unprocessable') {
      // Expected for non-BHE releases — the release packet always asks for
      // 5150 but the form only applies to behavioral-health releases.
      // Silently skip; not an error.
    } else if (live5150.status !== 'ok') {
      throw new Error(`Live 5150 generation failed for deflection ${deflectionId}: ${live5150.status}${live5150.error ? ` (${live5150.error})` : ''}`);
    } else {
      live5150Attachment = live5150.attachment;
      emailAttachments.push(live5150Attachment);
      liveGeneratedFormIds.add('5150');
    }
  }

  for (const doc of deflection.deflectionDocuments) {
    if (liveGeneratedFormIds.has(doc.formId)) continue;
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
      locals:
        {
          subjectName: `${deflection.subject.firstName} ${deflection.subject.lastName}`,
          officerName: `${deflection.incident.createdBy.firstName} ${deflection.incident.createdBy.lastName}`,
          facilityName: deflection.facility.name,
          caseNumber: deflection.incident?.caseNumber,
        }
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

    if (live5150Attachment && targetFormIds.includes('5150')) {
      await storeLive5150Pdf(prismaClient, {
        deflectionId,
        userId,
        content: live5150Attachment.content,
        filename: live5150Attachment.filename,
      }).catch((error) => {
        console.error(JSON.stringify({
          event: '5150/store-failed',
          deflectionId,
          template,
          error: error.message,
        }));
        captureException(error, 'care-connect-worker', {
          event: '5150/store-failed',
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
        locals:
          {
            subjectName: `${deflection.subject.firstName} ${deflection.subject.lastName}`,
            officerName: `${deflection.incident.createdBy.firstName} ${deflection.incident.createdBy.lastName}`,
            facilityName: deflection.facility.name,
            caseNumber: deflection.incident?.caseNumber,
          }
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

  if (template === 'self-cert') {
    await sendFormsMessage({
      targetFormIds: ['cert'],
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
    }

    await sendFormsMessage({
      targetFormIds: remainingFormIds,
      to,
      cc,
    });
  }
}
