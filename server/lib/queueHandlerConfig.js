import inviteEmail from '../jobs/inviteEmail.js';
import { QUEUE_INVITE_EMAIL } from './queueNames.js';

const queues = [
  {
    name: QUEUE_INVITE_EMAIL,
    options: { retryLimit: 3, retryBackoff: true },
    handler: async (job) => inviteEmail(job.data),
    deadLetterData: (data) => ({ inviteId: data?.inviteId }),
  },
];

export default queues;
