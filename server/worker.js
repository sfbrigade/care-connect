import './config.js';

import { createBoss } from '#lib/jobQueue/pgBoss.js';
import queues from '#lib/jobQueue/queueConfig.js';

const boss = createBoss();

boss.on('error', (error) => {
  // TODO: send to Posthog for alerting
  console.error(JSON.stringify({
    event: 'job/error',
    error: error.message,
  }));
});

await boss.start();

for (const queue of queues) {
  const deadLetter = `${queue.name}-dead-letter`;

  await boss.createQueue(deadLetter, { retryLimit: 0 });
  await boss.createQueue(queue.name, {
    ...queue.options,
    deadLetter,
  });

  await boss.work(queue.name, queue.handler);

  await boss.work(deadLetter, async ([job]) => {
    const jobData = queue.deadLetterData ? queue.deadLetterData(job.data) : job.data;
    // TODO: send to Posthog for alerting
    console.error(JSON.stringify({
      event: 'job/permanently-failed',
      queue: queue.name,
      jobData,
    }));
  });
}

async function shutdown () {
  console.log('Worker shutting down...');
  try {
    await boss.stop();
  } catch (err) {
    // TODO: send to Posthog for alerting
    console.error('Error stopping boss:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Worker started, listening for jobs...');
