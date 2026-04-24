import inviteEmail from '../../jobs/inviteEmail.js';
import expireHolds from '../../jobs/expireHolds.js';
import generateForms from '../../jobs/generateForms.js';
import formsEmail from '../../jobs/formsEmail.js';
import anonymizeSubjects from '../../jobs/anonymizeSubjects.js';
import { QUEUE_INVITE_EMAIL, QUEUE_EXPIRE_HOLDS, QUEUE_GENERATE_FORMS, QUEUE_FORMS_EMAIL, QUEUE_ANONYMIZE_SUBJECTS } from './queueNames.js';

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
      const skippedFormIds = await generateForms(job.data) || [];
      if (job.data.emailTemplate) {
        const emailFormIds = job.data.formIds.filter((id) => !skippedFormIds.includes(id));
        if (emailFormIds.length > 0) {
          await send(QUEUE_FORMS_EMAIL, {
            deflectionId: job.data.deflectionId,
            formIds: emailFormIds,
            template: job.data.emailTemplate,
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
];
export default queues;
