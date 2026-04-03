import inviteEmail from '../../jobs/inviteEmail.js';
import expireHolds from '../../jobs/expireHolds.js';
import { QUEUE_INVITE_EMAIL, QUEUE_EXPIRE_HOLDS } from './queueNames.js';

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
];
export default queues;
