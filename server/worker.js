import './config.js';

import { createBoss } from '#lib/pgBoss.js';
import inviteEmail from './jobs/inviteEmail.js';

const boss = createBoss();

boss.on('error', (error) => {
  console.error(JSON.stringify({
    event: 'pgboss/error',
    error: error.message,
  }));
});

await boss.start();

await boss.work('invite-email', async (job) => {
  await inviteEmail(job.data);
});

await boss.onComplete('invite-email', async (job) => {
  if (job.data.failed) {
    console.error(JSON.stringify({
      event: 'job/permanently-failed',
      queue: 'invite-email',
      jobId: job.data.request.id,
      error: job.data.response,
      inviteId: job.data.request.data?.inviteId,
    }));
  }
});

async function shutdown () {
  console.log('Worker shutting down...');
  await boss.stop();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Worker started, listening for jobs...');
