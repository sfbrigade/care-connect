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

// Create queues with dead letter routing for failure alerting
await boss.createQueue('invite-email-dead-letter', { retryLimit: 0 });
await boss.createQueue('invite-email', {
  retryLimit: 3,
  retryBackoff: true,
  deadLetter: 'invite-email-dead-letter',
});

await boss.work('invite-email', async (job) => {
  await inviteEmail(job.data);
});

// Log jobs that exhausted all retries
await boss.work('invite-email-dead-letter', async (job) => {
  console.error(JSON.stringify({
    event: 'job/permanently-failed',
    queue: 'invite-email',
    inviteId: job.data?.inviteId,
  }));
});

async function shutdown () {
  console.log('Worker shutting down...');
  try {
    await boss.stop();
  } catch (err) {
    console.error('Error stopping boss:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Worker started, listening for jobs...');
