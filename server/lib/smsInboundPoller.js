import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

import { parseInboundSqsBody, handleInboundSms } from '#lib/smsInbound.js';

// Long-polls the inbound SMS SQS queue (fed by SNS ← two-way toll-free number) and
// dispatches each message to handleInboundSms. Started from worker.js. Returns a stop() function.
export function startInboundSmsPoller () {
  const QueueUrl = process.env.AWS_SMS_INBOUND_QUEUE_URL;
  if (!QueueUrl) {
    console.log('[sms-inbound] AWS_SMS_INBOUND_QUEUE_URL not set — inbound poller disabled');
    return () => {};
  }

  const sqs = new SQSClient({
    credentials: {
      accessKeyId: process.env.AWS_SMS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SMS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_SMS_REGION ?? 'us-west-2',
  });

  let running = true;

  (async function loop () {
    console.log('[sms-inbound] poller started');
    // `running` is flipped by the returned stop() closure, not in this scope.
    // eslint-disable-next-line no-unmodified-loop-condition
    while (running) {
      try {
        const { Messages } = await sqs.send(new ReceiveMessageCommand({
          QueueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20, // long poll
        }));
        for (const msg of Messages ?? []) {
          try {
            const parsed = parseInboundSqsBody(msg.Body);
            if (parsed) await handleInboundSms(parsed);
            else console.warn('[sms-inbound] unparseable message, dropping');
          } catch (err) {
            console.error('[sms-inbound] handler error:', err.message);
          } finally {
            // Delete after the processing attempt (parsed or not) to avoid a
            // poison message looping forever. Keyword handling is low-stakes and
            // idempotent, so losing a rare transient-error message is acceptable.
            await sqs.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: msg.ReceiptHandle }))
              .catch((err) => console.error('[sms-inbound] delete failed:', err.message));
          }
        }
      } catch (err) {
        console.error('[sms-inbound] poll error:', err.message);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // back off on error
      }
    }
  })();

  return () => { running = false; };
}
