import inviteEmail from '../../jobs/inviteEmail.js';
import pushNotification from '../../jobs/pushNotification.js';
import expireHolds from '../../jobs/expireHolds.js';
import generateForms from '../../jobs/generateForms.js';
import formsEmail from '../../jobs/formsEmail.js';
import anonymizeSubjects from '../../jobs/anonymizeSubjects.js';
import canary from '../../jobs/canary.js';
import { LIVE_EMAIL_FORM_IDS } from '#lib/forms/liveEmailForms.js';
import { captureException } from '#lib/posthog.js';
import { QUEUE_INVITE_EMAIL, QUEUE_EXPIRE_HOLDS, QUEUE_GENERATE_FORMS, QUEUE_FORMS_EMAIL, QUEUE_ANONYMIZE_SUBJECTS, QUEUE_CANARY, QUEUE_PUSH_NOTIFICATION } from './queueNames.js';

function normalizeGenerateFormsResult (result) {
  if (Array.isArray(result)) {
    return {
      skippedFormIds: result,
      generatedFormIds: [],
      updatedSinceTransferFormIds: [],
    };
  }
  return {
    skippedFormIds: result?.skippedFormIds || [],
    generatedFormIds: result?.generatedFormIds || [],
    updatedSinceTransferFormIds: result?.updatedSinceTransferFormIds || [],
  };
}

const queues = [
  {
    name: QUEUE_INVITE_EMAIL,
    options: { retryLimit: 3, retryBackoff: true },
    handler: async ([job]) => inviteEmail(job.data),
    deadLetterData: (data) => ({ inviteId: data?.inviteId }),
  },
  {
    name: QUEUE_EXPIRE_HOLDS,
    options: { retryLimit: 1 },
    handler: async ([job]) => expireHolds(job.data),
    cron: '* * * * *',
  },
  {
    name: QUEUE_GENERATE_FORMS,
    options: { retryLimit: 3, retryBackoff: true },
    handler: async ([job], { send }) => {
      const formIds = job.data.formIds || [];
      // Some email attachments, currently 849(b), must be generated at send
      // time so automatic emails cannot pick up stale DeflectionDocument assets.
      const shouldUseLiveEmailForms = Boolean(job.data.emailTemplate);
      const storedFormIds = shouldUseLiveEmailForms
        ? formIds.filter((id) => !LIVE_EMAIL_FORM_IDS.has(id))
        : formIds;
      let generationResult = normalizeGenerateFormsResult();
      let generationFailed = false;
      try {
        generationResult = storedFormIds.length > 0 || !job.data.formIds
          ? normalizeGenerateFormsResult(await generateForms({ ...job.data, formIds: storedFormIds.length > 0 ? storedFormIds : job.data.formIds }))
          : normalizeGenerateFormsResult();
      } catch (error) {
        if (!job.data.emailTemplate) throw error;
        // If there's a form generation error, don't block the whole email,
        // but do log the issue to make it visible.
        const context = {
          event: 'generate-forms/failed',
          deflectionId: job.data.deflectionId,
          formIds: job.data.formIds,
          emailTemplate: job.data.emailTemplate,
        };
        console.error(JSON.stringify({ ...context, error: error.message }));
        captureException(error, 'care-connect-worker', context);
        generationFailed = true;
      }
      if (job.data.emailTemplate) {
        const regeneratedFormIds = generationFailed
          ? []
          : [...new Set([
              ...generationResult.generatedFormIds,
              ...generationResult.updatedSinceTransferFormIds,
            ])];
        const emailFormIds = job.data.emailTemplate === 'release-forms'
          ? formIds
          : formIds.filter((id) =>
            LIVE_EMAIL_FORM_IDS.has(id) || (!generationFailed && !generationResult.skippedFormIds.includes(id))
          );
        if (emailFormIds.length > 0) {
          await send(QUEUE_FORMS_EMAIL, {
            deflectionId: job.data.deflectionId,
            formIds: emailFormIds,
            template: job.data.emailTemplate,
            recipientEmail: job.data.recipientEmail,
            userId: job.data.userId,
            regeneratedFormIds,
          });
        }
      }
    },
    deadLetterData: (data) => ({ deflectionId: data?.deflectionId }),
  },
  {
    name: QUEUE_FORMS_EMAIL,
    options: { retryLimit: 3, retryBackoff: true },
    handler: async ([job]) => formsEmail(job.data),
    deadLetterData: (data) => ({ deflectionId: data?.deflectionId }),
  },
  {
    name: QUEUE_ANONYMIZE_SUBJECTS,
    options: { retryLimit: 1 },
    handler: async ([job]) => anonymizeSubjects(job.data),
    cron: '0 * * * *',
  },
  {
    name: QUEUE_PUSH_NOTIFICATION,
    options: { retryLimit: 2, retryBackoff: true },
    handler: async ([job]) => pushNotification(job.data),
    deadLetterData: (data) => ({ userIds: data?.userIds }),
  },
  {
    name: QUEUE_CANARY,
    options: { retryLimit: 0 },
    handler: async ([job]) => canary(job.data),
  },
];
export default queues;
